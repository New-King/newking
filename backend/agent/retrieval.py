"""检索模块：混合检索（语义向量 + BM25 关键词，RRF 融合）。

架构（业界成熟做法，复用 LangChain 组件）：
  语义检索  ──┐
              ├─▶ EnsembleRetriever（RRF 逆序秩融合）──▶ 结果
  BM25关键词 ─┘

- 语义检索：pgvector 余弦距离（ChunksVectorRetriever，查现有 chunks 表）。
  这是我们保留的定制：连数据库、按余弦距离排序、相关性阈值过滤、按篇去重。
- 关键词检索：BM25Retriever（LangChain 官方组件），jieba 中文分词，
  精准匹配"专有名词/产品名"等语义检索易漏的词。
- 融合：EnsembleRetriever（LangChain 官方组件，langchain_classic），
  用 RRF（Reciprocal Rank Fusion）融合两路结果，id_key 去重。

查询路由（needs_retrieval）—— 业界分层的做法：
  L0 规则层（便宜、快）：问候/寒暄/道谢词表拦截、乱码检测（无中文字符）。
  向量阈值层：距离 > RELEVANCE_THRESHOLD 视为不相关，过滤掉。
  这两层组合解决"闲聊/乱码/问候也去检索"的问题；
  更复杂的（如"你是谁"这种需要检索的短问）留给向量阈值放行。

为什么用 EnsembleRetriever 而不是手写：
  手写"语义+关键词合并排序"容易踩坑（拆词不准、融合权重不标准），
  LangChain 提供现成的 EnsembleRetriever（RRF 融合）+ BM25Retriever（jieba 分词），
  是业界标准做法，后续好维护。见 AGENTS.md"复用成熟框架组件"守则。

为什么向量检索用自定义 retriever 而非 PGVector：
  PGVector 要求自己的表结构（langchain_pg_embedding），无法直接读我们现有
  chunks 表，迁移需重灌数据+改 indexer。我们的向量检索已用裸 SQL 稳定运行，
  包成 BaseRetriever 即可接入 EnsembleRetriever，改动最小、不迁数据。
"""
import re

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers.ensemble import EnsembleRetriever

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
# 融合权重：语义略高（语义理解更重要），关键词次之（精准词补充）
VECTOR_WEIGHT = 0.6
BM25_WEIGHT = 0.4

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


class ChunksVectorRetriever(BaseRetriever):
    """语义向量检索器：查现有 pgvector chunks 表。

    保留原有定制逻辑：余弦距离排序 + 相关性阈值过滤 + 按篇去重（每篇限 2 块）。
    实现 BaseRetriever 接口，供 EnsembleRetriever 组合。
    """

    top_k: int = MAX_RESULTS

    def _get_relevant_documents(self, query):
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
        per_doc = {}
        for content, metadata, distance in rows:
            if float(distance) > RELEVANCE_THRESHOLD:
                break
            doc_id = (metadata or {}).get("doc_id", "")
            if per_doc.get(doc_id, 0) >= 2:
                continue
            per_doc[doc_id] = per_doc.get(doc_id, 0) + 1
            results.append(
                Document(
                    page_content=content,
                    metadata=metadata or {},
                )
            )
            if len(results) >= self.top_k:
                break
        return results


# BM25 检索器：惰性单例（首次 search 时从 content 加载全部文档建索引，之后复用）
_bm25_retriever = None
_bm25_doc_count = 0


def _build_bm25_retriever():
    """构建 BM25 检索器：从 content 加载全部文档（标题+正文），jieba 中文分词。

    由于 content 会变化（增删文章），这里按"文档数量变化"判断是否需要重建。
    """
    global _bm25_retriever, _bm25_doc_count
    from .content import get_content

    data = get_content()
    posts = data.get("posts") or []
    notes = data.get("notes") or []
    projects = data.get("projects") or []

    # 类型 → 数据库 doc_id 的目录名（doc_id 形如 posts/p1-personal-site.md）
    # 注意：url 里是 /blog/，但数据库目录是 posts/，所以直接用类型变量而非 url 反推。
    sections = [
        ("posts", data.get("posts") or []),
        ("notes", data.get("notes") or []),
        ("projects", data.get("projects") or []),
    ]

    texts = []
    metadatas = []
    for dirname, items in sections:
        for item in items:
            raw_id = item.get("id", "")
            doc_id = f"{dirname}/{raw_id}.md"
            texts.append(f"{item.get('title', '')}\n{item.get('description', '')}\n{item.get('content', '')}")
            metadatas.append({
                "doc_id": doc_id,
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "date": str(item.get("date") or ""),
            })

    count = len(texts)
    if _bm25_retriever is not None and count == _bm25_doc_count:
        return _bm25_retriever

    _bm25_doc_count = count
    _bm25_retriever = BM25Retriever.from_texts(texts, metadatas=metadatas)
    _bm25_retriever.k = MAX_RESULTS * 3  # 多取一些，融合后再由 EnsembleRetriever 截断
    # jieba 中文分词（BM25 默认按字符切分，jieba 效果更好）
    try:
        import jieba

        def _tokenize(text):
            return list(jieba.cut(text))

        _bm25_retriever.preprocess_func = _tokenize
    except ImportError:
        pass  # 无 jieba 时退回默认字符切分
    return _bm25_retriever


def _build_ensemble():
    """构建混合检索器（语义 + BM25，RRF 融合，按 doc_id 去重）。"""
    vector_retriever = ChunksVectorRetriever()
    bm25_retriever = _build_bm25_retriever()
    return EnsembleRetriever(
        retrievers=[vector_retriever, bm25_retriever],
        weights=[VECTOR_WEIGHT, BM25_WEIGHT],
        id_key="doc_id",  # 用 doc_id 去重（同一篇的块只保留一个），替代手写按篇去重
    )


def search(query, top_k=MAX_RESULTS):
    """混合检索：语义向量 + BM25 关键词，RRF 融合后返回最相关的内容块。

    参数：
        query：用户的问题（字符串）。
        top_k：最多返回几个块（默认 5）。
    返回：
        列表，每个元素 {content, score（RRF融合分）, metadata}。
        查询路由判定不需要检索，或没有任何相关块时，返回空列表。
    """
    if not needs_retrieval(query):
        return []

    ensemble = _build_ensemble()
    docs = ensemble.invoke(query)
    docs = docs[:top_k]

    # 转成统一返回结构（与原先一致，供 chat.py 使用）
    # score 用"排名分数"（越靠前越大），表示相关性；EnsembleRetriever 已按 RRF 排序。
    results = []
    for i, doc in enumerate(docs):
        results.append(
            {
                "content": doc.page_content,
                "score": 1.0 / (i + 1),  # 位置分数，越靠前越大
                "metadata": doc.metadata or {},
            }
        )
    return results
