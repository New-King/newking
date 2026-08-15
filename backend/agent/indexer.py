import hashlib
import json
import re
from pathlib import Path

import yaml
from langchain_openai import OpenAIEmbeddings

from .config import CONTENT_DIR, EMBEDDING_MODEL, SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL
from .db import get_conn, init_db


def make_embeddings():
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=SILICONFLOW_API_KEY,
        base_url=SILICONFLOW_BASE_URL,
    )


def parse_md(text):
    meta = {}
    body = text
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            raw = text[3:end]
            try:
                meta = yaml.safe_load(raw) or {}
            except yaml.YAMLError:
                meta = {}
            body = text[end + 4:].lstrip("\n")
    return meta, body


def split_by_headings(body):
    chunks = []
    heading = None
    lines = []

    def flush():
        if heading or lines:
            parts = [heading] if heading else []
            parts.extend(lines)
            content = "\n".join(p for p in parts if p)
            if content.strip():
                chunks.append(content.strip())
            return
    for line in body.splitlines():
        if re.match(r"^#{1,3} ", line):
            flush()
            heading = line
            lines = []
        else:
            lines.append(line)
    flush()
    return chunks


def content_hash(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def json_safe(value):
    if isinstance(value, (dict, list)):
        return {k: json_safe(v) for k, v in value.items()} if isinstance(value, dict) else [json_safe(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def iter_docs():
    for path in sorted(CONTENT_DIR.rglob("*.md")):
        yield path.relative_to(CONTENT_DIR).as_posix(), path


def index_all():
    embeddings = make_embeddings()
    init_db()
    changed = 0
    current_ids = set()

    with get_conn() as conn:
        for doc_id, path in iter_docs():
            current_ids.add(doc_id)
            text = path.read_text(encoding="utf-8")
            digest = content_hash(text)

            row = conn.execute(
                "SELECT content_hash FROM documents WHERE doc_id = %s", (doc_id,)
            ).fetchone()
            if row and row[0] == digest:
                continue

            meta, body = parse_md(text)
            chunks = split_by_headings(body)
            if not chunks:
                continue

            vectors = embeddings.embed_documents(chunks)
            with conn.cursor() as cur:
                cur.execute("DELETE FROM documents WHERE doc_id = %s", (doc_id,))
                cur.execute(
                    "INSERT INTO documents (doc_id, content_hash) VALUES (%s, %s)",
                    (doc_id, digest),
                )
                for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
                    metadata = json_safe({**meta, "doc_id": doc_id, "chunk_index": i})
                    cur.execute(
                        "INSERT INTO chunks (doc_id, chunk_index, content, metadata, embedding) "
                        "VALUES (%s, %s, %s, %s, %s)",
                        (doc_id, i, chunk, json.dumps(metadata, ensure_ascii=False), vec),
                    )
            changed += 1

        conn.execute("DELETE FROM documents WHERE NOT (doc_id = ANY(%s))", (list(current_ids),))
        conn.commit()

    return changed
