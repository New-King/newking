"""检索模块：把用户问题变成向量，在知识库里找出最相关的内容块。

流程：问题 → bge-m3 向量化 → 在 pgvector 里用余弦距离找最相似的几个块 → 返回。

返回的每个结果包含块内容和它来源的文档信息（标题、日期、媒体等），
这些信息后续用来：1) 拼进 prompt 让模型参考；2) 决定要不要附图片/链接/视频。
"""
from .config import SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL, EMBEDDING_MODEL
from .db import get_conn
from .indexer import make_embeddings


def search(query, top_k=5):
    """检索最相关的 top_k 个块。

    参数：
        query：用户的问题（字符串）。
        top_k：返回多少个块（默认 5）。
    返回：
        列表，每个元素是一个字典，含：
            content   块正文
            score     相似度分数（pgvector 余弦距离，越小越相似）
            metadata  该块的元数据（title/date/cover/video/links/doc_id 等）
    """
    embeddings = make_embeddings()   # 复用索引时的向量化工具（同一个模型，维度一致）
    query_vec = embeddings.embed_query(query)  # 问题 → 1024 维向量

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

    results = []
    for content, metadata, distance in rows:
        results.append(
            {
                "content": content,
                "score": float(distance),
                "metadata": metadata,
            }
        )
    return results
