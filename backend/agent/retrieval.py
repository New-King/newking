"""检索模块：把用户问题变成向量，在知识库里找出最相关的内容块。

流程：问题 → 查询路由判断（是否需要检索）→ bge-large-zh-v1.5 向量化 →
      pgvector 余弦距离找候选 → 相关性阈值过滤。

查询路由（needs_retrieval）—— 业界分层的做法：
  L0 规则层（便宜、快）：问候/寒暄/道谢词表拦截、乱码检测（无中文字符）。
  向量阈值层：距离 > RELEVANCE_THRESHOLD 视为不相关，过滤掉。
  这两层组合解决"闲聊/乱码/问候也去检索"的问题；
  更复杂的（如"你是谁"这种需要检索的短问）留给向量阈值放行。

相关性阈值（RELEVANCE_THRESHOLD = 0.58）：
- 余弦距离 ≤ 阈值 = 语义相关（保留）
- 余弦距离 > 阈值 = 不相关（过滤，如乱码/与知识库无关）

为什么不做 rerank（重排）：实测 SiliconFlow 的 bge-reranker-v2-m3 对中文帮倒忙，
bge-large-zh-v1.5 的向量检索本身已够准。
"""
import re

from .config import SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL
from .db import get_conn
from .indexer import make_embeddings

# 相关性阈值（余弦距离，越小越相关）
# 0.55：相关查询（博客/笔记/项目）最近距离 0.36~0.51；编程等无关查询 0.51~0.56。
# 收紧到 0.55 能让大多数与知识库无关的问题（写代码/算法/闲聊）走纯聊天。
RELEVANCE_THRESHOLD = 0.55
# 召回数量（先取这些再过滤）
RECALL_TOP_K = 10
# 最终最多返回的块数
MAX_RESULTS = 5

# L0 规则层：明确不需要检索的输入（问候/寒暄/道谢/无意义）
_NAVIGATION_PHRASES = {
    "你好", "您好", "嗨", "哈喽", "hello", "hi", "hey",
    "在吗", "在不在", "在么",
    "谢谢", "感谢", "多谢", "thanks",
    "再见", "拜拜", "晚安", "早上好", "下午好", "晚上好",
    "随便聊聊", "随便聊", "没事", "没事了", "嗯", "哦",
    "哈哈", "哈哈哈", "呵呵",
}


def needs_retrieval(query):
    """判断这个问题是否需要检索知识库（查询路由）。

    返回 False 的情况（直接聊天，不检索）：
      1. 无中文且无英文单词（乱码/纯符号/纯数字）
      2. 命中问候/寒暄/道谢词表
      3. 长度过短且无实质含义
    """
    q = (query or "").strip()
    if not q:
        return False
    # 乱码检测：无中文字符（纯乱码/纯符号）
    if not re.search(r"[\u4e00-\u9fff]", q) and not re.search(r"[a-zA-Z]{2,}", q):
        return False
    # 问候/寒暄/道谢词表
    if q in _NAVIGATION_PHRASES:
        return False
    # 太短且是单个语气词
    if len(q) <= 1:
        return False
    return True


def search(query, top_k=MAX_RESULTS):
    """检索与问题相关的内容块（含查询路由 + 相关性阈值过滤）。

    参数：
        query：用户的问题（字符串）。
        top_k：最多返回几个块（默认 5）。
    返回：
        列表，每个元素 {content, score（余弦距离）, metadata}。
        查询路由判定不需要检索，或没有任何相关块时，返回空列表。
    """
    if not needs_retrieval(query):
        return []

    embeddings = make_embeddings()
    query_vec = embeddings.embed_query(query)

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT content, metadata, embedding <=> %s::vector AS distance
            FROM chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_vec, query_vec, RECALL_TOP_K),
        ).fetchall()

    results = []
    per_doc = {}  # doc_id -> 已保留的块数（去重，避免单篇刷屏掩盖其他文章）
    for content, metadata, distance in rows:
        if float(distance) > RELEVANCE_THRESHOLD:
            break  # 已按距离升序，后面的更远，全部不相关
        doc_id = (metadata or {}).get("doc_id", "")
        if per_doc.get(doc_id, 0) >= 2:
            continue  # 同一篇最多保留 2 块，让其他文章有机会进入结果
        per_doc[doc_id] = per_doc.get(doc_id, 0) + 1
        results.append(
            {"content": content, "score": float(distance), "metadata": metadata}
        )
        if len(results) >= top_k:
            break

    # 关键词兜底：语义检索 0 条时，用 SQL LIKE 匹配标题/简介/内容再找一遍。
    # 解决"写过切块的文章吗"这种关键词型问题向量命中不了的情况（hybrid search 简化版）。
    if not results:
        results = keyword_fallback(query, top_k=top_k)

    return results


def keyword_fallback(query, top_k=MAX_RESULTS):
    """关键词兜底检索：按关键词匹配标题/简介/内容（SQL LIKE）。

    语义检索 0 条时调用，用关键词精确匹配，解决"标题/内容里含某词"的查询。
    """
    kw = (query or "").strip()
    if not kw:
        return []
    pattern = f"%{kw}%"
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT content, metadata, 0.0 AS distance
            FROM chunks
            WHERE content LIKE %s OR metadata->>'title' LIKE %s OR metadata->>'description' LIKE %s
            ORDER BY metadata->>'date' DESC
            LIMIT %s
            """,
            (pattern, pattern, pattern, top_k),
        ).fetchall()
    return [
        {"content": content, "score": 0.0, "metadata": metadata}
        for content, metadata, _ in rows
    ]
