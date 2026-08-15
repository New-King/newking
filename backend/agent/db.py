import psycopg

from .config import DATABASE_URL

SCHEMA = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  doc_id text PRIMARY KEY,
  content_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id serial PRIMARY KEY,
  doc_id text NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  embedding vector(1024)
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
"""


def get_conn():
    return psycopg.connect(DATABASE_URL)


def init_db():
    with get_conn() as conn:
        conn.execute(SCHEMA)
        conn.commit()
