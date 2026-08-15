"""数据库层：负责连接 Postgres，并确保表结构存在。

先搞懂几个概念：
- 数据库连接：程序要和数据库通信，必须先用一个"连接串"（DATABASE_URL）连上它。
- 连接串（DATABASE_URL）：形如 postgresql://用户名:密码@地址:端口/库名，
  告诉程序"去哪个数据库、用什么账号密码"。
- psycopg：Python 里操作 Postgres 的标准库，负责建立连接、执行 SQL。
- 表结构（SCHEMA）：定义数据库里有什么表、每张表有哪些列。用 SQL 的
  CREATE TABLE 语句描述，程序第一次跑时自动建表。

本文件职责：
1. get_conn()：用配置里的 DATABASE_URL 连上数据库，返回一个连接。
2. init_db()：确保表存在（没有就建，有了就跳过），每次启动/索引前调用。
"""
import psycopg

from .config import DATABASE_URL

# SCHEMA：一段建表用的 SQL 脚本（字符串）。
# 幂等设计：每条语句都带 "IF NOT EXISTS"，
# 意思是"如果表/扩展还不存在，才创建"，所以重复执行不会报错。
SCHEMA = """
-- 启用向量扩展（pgvector）。就是之前手动装的那个插件，
-- 这里代码里再确保一次：没有就创建，有了就跳过。
CREATE EXTENSION IF NOT EXISTS vector;

-- documents 表：每一篇文档占一行。
-- 作用是记录"这篇文档上次索引时的内容哈希"，下次索引时对比，
-- 哈希一样=内容没变=跳过；不一样=内容变了=重新索引。这就是增量更新的依据。
CREATE TABLE IF NOT EXISTS documents (
  doc_id text PRIMARY KEY,            -- 文档唯一标识：相对路径，如 posts/p1.md
  content_hash text NOT NULL,         -- 内容 SHA-256 哈希（内容变了它就变）
  updated_at timestamptz NOT NULL DEFAULT now()  -- 最近索引时间（自动填当前时间）
);

-- chunks 表：切块后的"一个块"占一行，是检索时的最小单位。
CREATE TABLE IF NOT EXISTS chunks (
  id serial PRIMARY KEY,              -- 自增主键，每行一个唯一编号
  doc_id text NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
      -- 这块属于哪篇文档。ON DELETE CASCADE 意思是：删掉那篇文档时，它的所有块自动跟着删。
  chunk_index int NOT NULL,           -- 这是该文档的第几个块（从 0 开始）
  content text NOT NULL,              -- 块正文（一段 markdown 文字）
  metadata jsonb NOT NULL DEFAULT '{}',  -- 元数据（标题/日期/cover/video/links），JSON 格式
  embedding vector(1024)              -- 这块文字对应的 1024 维向量（bge-m3 算出来的）
);

-- HNSW 向量索引：给 embedding 列建一个专门的"快速查找索引"。
-- 没它也能查，但会很慢；有了它，几万条数据里找"最相似的向量"也是毫秒级。
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
"""


def get_conn():
    """创建并返回一个数据库连接。

    psycopg.connect(DATABASE_URL) 做的事：
    拿着连接串里的地址、端口、账号、密码，去连上那个 Postgres。
    连上后，返回的连接对象就能执行 SQL 了。

    注意（开发期）：DATABASE_URL 里是 127.0.0.1:5432，指"本机端口"。
    所以运行前必须先开 SSH 隧道，把本机 5432 转发到服务器的 5432，
    否则会报 Connection refused（详见 backend/README.md）。
    """
    return psycopg.connect(DATABASE_URL)


def init_db():
    """确保表结构存在。

    每次索引/启动前调用：连上数据库，执行 SCHEMA 里的建表语句。
    因为都带 IF NOT EXISTS，所以表已存在时执行只是"确认一下"，不会报错。
    """
    with get_conn() as conn:   # 开一个连接，用完后自动关闭（with 语句保证）
        conn.execute(SCHEMA)   # 执行建表 SQL
        conn.commit()          # 提交（不提交的话，改动不会真正生效）
