# 后端运行说明（Python Agent 服务）

Step 3 完成：知识库索引管线。把 `content/*.md` 切块 → SiliconFlow bge-m3 向量化 → 存入服务器 Postgres（pgvector）。

## 环境要求

- macOS / Linux
- Python 3.12（已装，用 `.venv` 虚拟环境，不污染系统）
- 服务器 Postgres（含 pgvector 扩展，见 `docs/后端方案.md` Step 2）
- SiliconFlow API key（bge-m3 embedding）
- DeepSeek API key（Step 4 对话接口用）

## 目录结构

```
backend/
├── requirements.txt   依赖清单（= 前端的 package.json）
├── .env               配置（key、数据库连接，已被 .gitignore 忽略，不进 git）
├── .env.example       配置模板（复制成 .env 后填真实值）
└── agent/
    ├── __init__.py    包标记文件
    ├── config.py      读取 .env 配置（key、数据库、内容目录）
    ├── db.py          数据库连接 + 建表（documents / chunks）
    ├── indexer.py     索引管线核心（切块 → 向量化 → 入库）
    └── app.py         FastAPI 入口（对外 HTTP 接口）
```

## 首次运行

```bash
# 1. 创建虚拟环境（若还没有）
python3.12 -m venv .venv

# 2. 安装依赖
.venv/bin/pip install -r backend/requirements.txt

# 3. 配置
cp backend/.env.example backend/.env
# 编辑 .env，填入 SiliconFlow key 和数据库连接串

# 4. 开 SSH 隧道（开发期 Mac → 服务器数据库，必须）
ssh -N -L 5432:127.0.0.1:5432 -i ~/.ssh/newking_deploy -p 22 root@111.231.13.51
# 保持这个终端窗口开着（部署到服务器后不需要隧道，Python 和 Postgres 同机）
```

## 运行索引（两种方式）

方式一：直接调 Python（推荐开发期）
```bash
.venv/bin/python -c "from backend.agent.indexer import index_all; print(index_all())"
```

方式二：启动 FastAPI 服务后调接口
```bash
cd backend && ../.venv/bin/uvicorn agent.app:app --reload --port 8000
```
然后：
```bash
curl -X POST http://127.0.0.1:8000/api/index/index
curl http://127.0.0.1:8000/health
```

## 数据库表说明

| 表 | 作用 |
|---|---|
| `documents` | 每篇文档的记录，存内容哈希（增量判断用：内容变没变） |
| `chunks` | 切块后的内容 + 1024 维向量 + 元数据（标题/日期/媒体） |

索引是**增量幂等**的：内容没变的文档会跳过，变了才重切重算；源文件删除的文档会自动清掉。重复运行不会重复插入。

## 常见问题

- `Connection refused` / 对话一直卡在"知识库检索"：**SSH 隧道断了**。重开（带心跳保活，不易断）：
  ```bash
  nohup ssh -N -L 5432:127.0.0.1:5432 -i ~/.ssh/newking_deploy -p 22 root@111.231.13.51 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 &
  ```
  用 `nc -z -w 3 127.0.0.1 5432` 验证隧道通不通。
- `extension "vector" is not available`：pgvector 没装好，见 `docs/后端方案.md` Step 2
- 数据库连不上/鉴权失败：检查 `.env` 的 `DATABASE_URL`（用户名/密码/库名要对上 1Panel 的配置）
- 改后端代码后没生效：uvicorn 若没用 `--reload` 启动，需手动重启进程
