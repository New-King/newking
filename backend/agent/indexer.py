"""知识库索引管线（核心）：把 content/*.md 变成向量存进 Postgres。

整条管线一句话：扫文件 → 看内容变没变 → 变了的重新切块 → 向量化 → 入库。

先搞懂几个概念：
- 切块（chunking）：一篇文章太长了，整篇算一个向量会"语义混杂"。
  所以按标题切成若干小节，每节一个"块"，每个块单独算向量。
  检索时是"按块找"，命中哪块就返回哪块的原文。
- 向量化（embedding）：把一段文字交给 embedding 模型（bge-m3），
  它返回一串 1024 个数字（向量）。语义相近的文字，向量也相近。
- 增量索引：不是每次都全量重算。用"内容哈希"判断每篇文档变没变，
  没变的跳过，变了的才重算。这样重复跑很快，也不会重复插入。

本文件职责：实现上面这条管线，对外提供一个 index_all() 主入口。
"""
import hashlib   # 计算哈希（内容指纹）用
import json      # 元数据转成 JSON 字符串存库
import re        # 正则，用来识别 markdown 标题行
from pathlib import Path

import httpx     # 直接调 SiliconFlow embedding API
import yaml      # 解析 markdown 头部的 frontmatter（YAML 格式）

from .config import CONTENT_DIR, EMBEDDING_MODEL, SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL
from .db import get_conn, init_db


class SiliconFlowEmbeddings:
    """直接调用 SiliconFlow embedding API 的向量化工具。

    为什么不用 langchain_openai 的 OpenAIEmbeddings：
    它对 bge-large-zh-v1.5 会传不兼容参数导致 400（向量坍缩的坑之一），
    用原始 HTTP 请求最可控、行为与文档一致。

    接口对齐 LangChain：embed_query(单条) / embed_documents(批量)。
    """

    def __init__(self, model=None):
        self.model = model or EMBEDDING_MODEL

    def _embed(self, texts):
        resp = httpx.post(
            f"{SILICONFLOW_BASE_URL}/embeddings",
            headers={"Authorization": f"Bearer {SILICONFLOW_API_KEY}"},
            json={"model": self.model, "input": texts},
            timeout=60,
        )
        resp.raise_for_status()
        return [d["embedding"] for d in resp.json()["data"]]

    def embed_query(self, text):
        return self._embed([text])[0]

    def embed_documents(self, texts):
        return self._embed(texts)


def make_embeddings():
    """创建向量化工具。用自实现的 SiliconFlowEmbeddings（原始 HTTP 调用）。"""
    return SiliconFlowEmbeddings()


def parse_md(text):
    """解析一篇 markdown 文本，拆成"元数据 + 正文"两部分。

    markdown 文件的头部（frontmatter）长这样：
        ---
        title: 标题
        date: 2026-07-28
        ---
        正文从这里开始……
    第一部分（--- 包裹的 YAML 段）叫 frontmatter，存放标题/日期/封面等元数据。
    第二部分是正文。

    返回 (meta, body)：
    - meta：字典，如 {"title": "标题", "date": "2026-07-28"}
    - body：正文文本（去掉 frontmatter 之后的部分）
    """
    meta = {}        # 元数据，默认空
    body = text      # 正文，默认整篇
    if text.startswith("---"):          # 判断是否有 frontmatter
        end = text.find("\n---", 3)     # 找第二个 "---" 的位置（第一个在开头，跳过前3个字符）
        if end != -1:                   # 找到了完整的 frontmatter 段
            raw = text[3:end]           # 取出 --- 和 --- 之间的 YAML 文本
            try:
                meta = yaml.safe_load(raw) or {}   # YAML 文本转成 Python 字典
            except yaml.YAMLError:      # 解析失败（比如格式写错）就放弃，用空字典
                meta = {}
            body = text[end + 4:].lstrip("\n")   # 正文 = 第二个 --- 之后的内容，去掉开头空行
    return meta, body


def split_by_headings(body):
    """按标题切块：一个标题 + 它下面的内容 = 一个块。

    规则：
    - 遇到 ## 或 ### 开头的行，认为是新一节的开始
    - 前面的标题和内容合起来算一个块
    - 块与块之间互不重叠，每块语义独立

    为什么按标题切：一节讲一件事，语义完整。比按固定字数硬切（可能从半句话
    中间断开）检索效果更好。

    返回：字符串列表，每个字符串是一个块。例如：
    ["## 为什么需要可组合\n单个 Agent 只能……", "## 组成单元\n一个工作流通常由……"]
    """
    chunks = []     # 存放最终的所有块
    heading = None  # 当前正在收集的标题（None 表示还没有）
    lines = []      # 当前正在收集的正文行

    def flush():
        """把当前收集的"标题 + 正文行"合并成一个块，存进 chunks。

        这个函数是内部函数（闭包），可以直接读写外面的 chunks/heading/lines。
        """
        if heading or lines:                    # 有内容才处理
            parts = [heading] if heading else []  # 先放标题（如果有）
            parts.extend(lines)                  # 再放正文行
            content = "\n".join(p for p in parts if p)  # 用换行拼成一段文字，跳过空行
            if content.strip():                  # 去掉首尾空白后还不为空才要
                chunks.append(content.strip())

    for line in body.splitlines():   # 逐行遍历正文
        if re.match(r"^#{1,3} ", line):   # 这行是 ## 或 ### 标题
            flush()                       # 先把上一个块收尾
            heading = line                # 记录新标题
            lines = []                    # 开始新的正文收集
        else:
            lines.append(line)            # 普通行，收进当前块的正文
    flush()                               # 遍历结束后，收尾最后一块
    return chunks


def content_hash(text):
    """计算一段内容的 SHA-256 哈希（内容指纹）。

    哈希的特点：内容只要有哪怕一个字符不同，哈希就完全不同。
    所以可以用它判断"这篇文档变没变"——这是增量索引的依据。
    """
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def json_safe(value):
    """把元数据转成"能序列化成 JSON"的结构。

    为什么需要：frontmatter 里的 date: 2026-07-28 会被 YAML 解析成
    Python 的 date 对象，而 date 对象没法直接变成 JSON 字符串（会报错）。
    这里把 date 等非基础类型统一转成字符串。

    基础类型（字符串/数字/布尔/None）原样保留，字典和列表递归处理，其余转字符串。
    """
    if isinstance(value, (dict, list)):
        if isinstance(value, dict):
            return {k: json_safe(v) for k, v in value.items()}  # 字典逐项递归
        return [json_safe(v) for v in value]                     # 列表逐项递归
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value           # 基础类型，直接用
    return str(value)          # 其他（如 date）转字符串


def iter_docs():
    """遍历 content/ 目录下所有 .md 文件。

    rglob("*.md")：递归查找所有子目录里的 .md 文件（不限于顶层）。
    relative_to(CONTENT_DIR)：把绝对路径转成相对路径，作为文档唯一标识。

    产出 (doc_id, path)：
    - doc_id：相对路径字符串，如 "posts/p1-agent-workflow.md"
    - path：文件的完整路径对象（能直接读文件内容）
    """
    for path in sorted(CONTENT_DIR.rglob("*.md")):  # 排序保证顺序稳定
        yield path.relative_to(CONTENT_DIR).as_posix(), path  # yield 让本函数变成"生成器"，逐个产出


def index_all():
    """索引主流程：扫描全部文档，做增量更新。

    流程（对每篇文档）：
    1. 算内容哈希
    2. 和数据库里存的旧哈希比对
    3. 相同 → 内容没变，跳过
    4. 不同 → 删掉旧块，重新切块 + 向量化 + 插入
    最后清理：源文件已被删除的文档，从库里删掉。

    返回：本次变更（新增或更新）的文档数量。重复跑 = 0，证明幂等。
    """
    embeddings = make_embeddings()   # 创建向量化工具（一次就好）
    init_db()                        # 确保表存在
    changed = 0                      # 统计本次变更的文档数
    current_ids = set()              # 收集本次扫到的所有 doc_id，最后用来清理已删除的

    with get_conn() as conn:         # 开一个数据库连接，用完全自动关闭
        for doc_id, path in iter_docs():   # 逐篇文档
            current_ids.add(doc_id)        # 记录这篇在本次扫描里出现过
            text = path.read_text(encoding="utf-8")   # 读文件内容
            digest = content_hash(text)    # 算内容哈希

            # 增量判断：从数据库查这篇文档上次存过的哈希
            row = conn.execute(
                "SELECT content_hash FROM documents WHERE doc_id = %s", (doc_id,)
            ).fetchone()                   # fetchone：取一行结果
            if row and row[0] == digest:   # 库里存在且哈希相同 → 内容没变
                continue                   # 跳过，不处理

            # 走到这说明内容变了（或首次入库）：重新处理这篇
            meta, body = parse_md(text)    # 拆元数据和正文
            chunks = split_by_headings(body)  # 按标题切块
            if not chunks:                 # 这篇没有可切的内容就跳过
                continue

            vectors = embeddings.embed_documents(chunks)  # 把整批块一起向量化（一次请求）

            with conn.cursor() as cur:     # 开一个游标（执行多条 SQL 的入口）
                # 删掉这篇文档的旧数据。因为外键 ON DELETE CASCADE，
                # 删 documents 时，它的 chunks 会自动跟着删。
                cur.execute("DELETE FROM documents WHERE doc_id = %s", (doc_id,))
                # 重新登记文档 + 最新哈希
                cur.execute(
                    "INSERT INTO documents (doc_id, content_hash) VALUES (%s, %s)",
                    (doc_id, digest),
                )
                # 逐块插入 chunks 表：块文本 + 向量 + 元数据
                for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
                    metadata = json_safe({**meta, "doc_id": doc_id, "chunk_index": i})
                    cur.execute(
                        "INSERT INTO chunks (doc_id, chunk_index, content, metadata, embedding) "
                        "VALUES (%s, %s, %s, %s, %s)",
                        (doc_id, i, chunk, json.dumps(metadata, ensure_ascii=False), vec),
                    )
            changed += 1                   # 变更数 +1

        # 清理：本次扫描没出现的 doc_id = 源文件已被删除 → 从库里清掉
        conn.execute("DELETE FROM documents WHERE NOT (doc_id = ANY(%s))", (list(current_ids),))
        conn.commit()                      # 提交所有改动（不提交不生效）

    return changed
