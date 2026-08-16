"""检索模块：把用户问题变成向量，在知识库里找出最相关的内容块。

流程：问题 → bge-large-zh-v1.5 向量化 → pgvector 余弦距离找最相似的 top_k 个块。

为什么不做 rerank（重排）：
实测 SiliconFlow 的 bge-reranker-v2-m3 对中文会把正确结果排后（帮倒忙），
而 bge-large-zh-v1.5 的向量检索本身已经足够准（同一主题块明显排前）。
保留 rerank 入口（_rerank）供以后换到高质量 rerank 模型时复用。

返回的每个结果包含块内容和它来源的文档信息（标题、日期、媒体等），
这些信息后续用来：1) 拼进 prompt 让模型参考；2) 工具卡片展示相关文章。
"""
import httpx

from .config import SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL
from .db import get_conn
from .indexer import make_embeddings


def search(query, top_k=5):
    """检索最相关的 top_k 个块（纯向量检索）。

    参数：
        query：用户的问题（字符串）。
        top_k：返回多少个块（默认 5）。
    返回：
        列表，每个元素是一个字典，含 content / score（余弦距离）/ metadata。
    """
    embeddings = make_embeddings()  # 复用索引时的向量化工具（同一个模型，维度一致）
    query_vec = embeddings.embed_query(query)  # 问题 → 向量

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT content, metadata, embedding <=> %s::vector AS distance
            FROM chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_vec, query_vec, top_k),
        ).fetchall()

    return [
        {"content": content, "score": float(distance), "metadata": metadata}
        for content, metadata, distance in rows
    ]
