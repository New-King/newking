"""检索模块：把用户问题变成向量，在知识库里找出最相关的内容块。

流程（两步走，行业标准 RAG 检索）：
1. 召回：问题 → bge-m3 向量化 → pgvector 余弦距离找 top_retrieve（默认 20）个候选
2. 精排：用 bge-reranker 对候选重新打分，取 top_k（默认 5）个最相关的

为什么需要 rerank：纯向量检索对"语义相近但不相关"的内容区分度不够
（比如问 RAG，Vite 博客的向量分数可能和 RAG 博客很接近）。
reranker 是"问答对"级别的深度匹配，能把真正相关的排到前面，
这是生产级 RAG 的标配，也保证"引用才输出媒体"能命中真正带媒体的文章。

返回的每个结果包含块内容和它来源的文档信息（标题、日期、媒体等），
这些信息后续用来：1) 拼进 prompt 让模型参考；2) 决定要不要附图片/链接/视频。
"""
import httpx

from .config import SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL
from .db import get_conn
from .indexer import make_embeddings

RERANK_MODEL = "BAAI/bge-reranker-v2-m3"  # SiliconFlow 免费的重排模型


def _rerank(query, candidates, top_k):
    """用 bge-reranker 对候选块精排，返回排序后的候选（按相关性降序）。

    candidates：召回阶段的候选列表（含 content）。
    返回：精排后的候选列表（保留原 content/metadata，score 换成重排分数）。
    """
    docs = [c["content"] for c in candidates]
    resp = httpx.post(
        f"{SILICONFLOW_BASE_URL}/rerank",
        headers={"Authorization": f"Bearer {SILICONFLOW_API_KEY}"},
        json={"model": RERANK_MODEL, "query": query, "documents": docs},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    ranked = sorted(data["results"], key=lambda r: r["relevance_score"], reverse=True)
    out = []
    for r in ranked[:top_k]:
        c = candidates[r["index"]]
        out.append(
            {
                "content": c["content"],
                "score": r["relevance_score"],
                "metadata": c["metadata"],
            }
        )
    return out


def search(query, top_k=5, top_retrieve=20):
    """检索最相关的 top_k 个块（召回 + 重排）。

    参数：
        query：用户的问题（字符串）。
        top_k：最终返回几个块（默认 5）。
        top_retrieve：召回阶段先取几个候选（默认 20，越大召回越全但 rerank 越慢）。
    返回：
        列表，每个元素是一个字典，含 content / score / metadata。
    """
    embeddings = make_embeddings()  # 复用索引时的向量化工具（同一个模型，维度一致）
    query_vec = embeddings.embed_query(query)  # 问题 → 1024 维向量

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT content, metadata, embedding <=> %s::vector AS distance
            FROM chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_vec, query_vec, top_retrieve),
        ).fetchall()

    candidates = [
        {"content": content, "metadata": metadata, "distance": float(distance)}
        for content, metadata, distance in rows
    ]

    return _rerank(query, candidates, top_k)
