# 后端（Python Agent 服务）说明

后端是网站对话 Agent 的服务端：内容进知识库 → 检索 → DeepSeek 生成 → SSE 流式返回前端。
本文件是后端**唯一文档**（架构、技术选型、检索策略、运行、调试都在此）。

## 1. 架构总览

```
content/*.md（内容源：博客/笔记/项目，git 即唯一内容源）
      │  push → CI 同步 + 触发索引接口
      ▼
索引管线（indexer.py）：解析 → 按标题切块 → embedding → upsert pgvector（增量、幂等）
      ▼
PostgreSQL + pgvector（向量 + 元数据；测试库 newking_test / 正式库 newking_prod）
      ▼
对话服务（chat.py，FastAPI）
      模型通过 function calling 自主决定是否调用 search_knowledge 工具
      → 检索结果回填 → DeepSeek 流式生成 → SSE 块事件
      ▼
前端 React（对话 + 博客/项目/笔记页，运行时从 /api 拉数据）
```

质量闭环：LangSmith 全链路追踪（记录每一步操作）。
部署：本地先跑通 → 服务器 Docker Compose（见 `docs/部署指南.md`）。

## 2. 技术选型

| 层 | 技术 |
|---|---|
| LLM | DeepSeek（`deepseek-chat`，OpenAI 兼容 + function calling） |
| Embedding | SiliconFlow `BAAI/bge-large-zh-v1.5`（中文专用，1024 维） |
| 向量存储 | PostgreSQL + pgvector（余弦距离 / HNSW 索引） |
| 检索 | 向量检索 + 相关性阈值（`RELEVANCE_THRESHOLD=0.55`） |
| 对话编排 | LangChain（`ChatOpenAI` + `bind_tools`） |
| API | FastAPI + SSE |
| 追踪 | LangSmith（可选，配 key 才启用） |
| 内容源 | markdown + YAML frontmatter |

> 为什么不用 rerank：实测 SiliconFlow 的 bge-reranker-v2-m3 对中文会把正确结果排后（帮倒忙），
> 而 bge-large-zh-v1.5 的向量检索本身已够准。保留 `_rerank` 入口供将来换高质量模型。

## 3. 目录结构

```
backend/
├── requirements.txt   依赖清单（= 前端的 package.json）
├── .env               配置（key、数据库连接，已被 .gitignore 忽略，不进 git）
├── .env.example       配置模板（复制成 .env 后填真实值）
└── agent/
    ├── __init__.py    包标记文件
    ├── config.py      读取 .env 配置（key、数据库、内容目录、LangSmith）
    ├── db.py          数据库连接 + 建表（documents / chunks）
    ├── indexer.py     索引管线（切块 → 向量化 → 入库，增量幂等）
    ├── retrieval.py   检索（向量 + 相关性阈值过滤）
    ├── chat.py        对话（function calling → 检索回填 → DeepSeek 流式 → SSE）
    ├── content.py     内容 API（把 content/*.md 解析成 JSON 供页面展示）
    ├── site_context.py 网站背景（about/resume/contact 人格底座 → 注入系统提示词）
    └── app.py         FastAPI 入口（对外接口集合）
```

## 4. 检索与对话策略（重要）

**查询路由 —— 模型自主决定（function calling）**
对话不是"先检索再生成"的流水线，而是把 `search_knowledge` 做成一个**工具**：
- 需要查知识库（"你写过 RAG 博客吗"）→ 模型返回 tool_call → 执行检索 → 结果回填
- 不需要（"写个快速排序"/闲聊/你是谁）→ 模型直接回答，不调工具

**相关性阈值（`retrieval.py`）**
`search()` 检索后按余弦距离过滤（>0.55 视为不相关丢弃），防御性兜底。
实测：相关问题距离 0.36~0.51；无关问题（闲聊/乱码/编程）0.51+。

**人格底座（`site_context.py`）**
about / resume / contact 注入系统提示词（常驻上下文），回答"你是谁/经历/怎么联系"，
**不依赖检索**（不进入向量库）。知识库只含博客/笔记/项目。

**上下文窗口（`chat.py`）**
保留最近 `MAX_HISTORY_TURNS = 8` 轮，防历史无限膨胀。

## 5. SSE 事件协议（前端 AgentChat 按此渲染）

每行 `data: <json>`，空行分隔。事件类型：
| type | 说明 |
|---|---|
| `thinking` | 思考中 |
| `tool` | 知识库检索工具卡片（`status: running/done`，`related` 携带相关文章列表） |
| `text` | 流式文字增量（`delta`） |
| `text_done` | 文字结束 |
| `image` | 被引用块的正文图片（`src/caption`） |
| `link` | 被引用块的正文链接（`url/title`） |
| `done` | 本轮回复结束 |

## 6. 环境要求

- macOS / Linux
- Python 3.12（用 `.venv` 虚拟环境，不污染系统）
- 服务器 Postgres（含 pgvector 扩展）
- SiliconFlow API key（embedding）、DeepSeek API key（对话）
- LangSmith API key（可选，追踪用）

## 7. 首次运行

```bash
# 1. 创建虚拟环境（若还没有）
python3.12 -m venv .venv

# 2. 安装依赖
.venv/bin/pip install -r backend/requirements.txt

# 3. 配置
cp backend/.env.example backend/.env
# 编辑 .env，填入 SiliconFlow key、DeepSeek key、数据库连接串（可选：LangSmith key）

# 4. 开 SSH 隧道（开发期 Mac → 服务器数据库，必须）
nohup ssh -N -L 5432:127.0.0.1:5432 -i ~/.ssh/newking_deploy -p 22 root@111.231.13.51 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 &
# 保持隧道（部署到服务器后不需要，Python 和 Postgres 同机）
```

## 8. 启动与常用操作

```bash
# 启动后端服务
cd backend && ../.venv/bin/uvicorn agent.app:app --reload --port 8000

# 触发知识库索引（增量幂等）
curl -X POST http://127.0.0.1:8000/api/index/index

# 健康检查
curl http://127.0.0.1:8000/health

# 直接跑一次索引（开发期，不经 HTTP）
.venv/bin/python -c "from backend.agent.indexer import index_all; print(index_all())"

# 测试检索结果
.venv/bin/python -c "from backend.agent.retrieval import search; print(search('问题'))"
```

## 9. 数据库表说明

| 表 | 作用 |
|---|---|
| `documents` | 每篇文档的记录，存内容哈希（增量判断用） |
| `chunks` | 切块后的内容 + 1024 维向量 + 元数据（标题/日期/url/links） |

索引是**增量幂等**的：内容没变跳过，变了重切重算；源文件删除自动清掉。重复运行不会重复插入。

## 10. 对话调试（回答质量差时）

按下面流程定位，禁止凭猜乱改：

1. **复现 + 看 LangSmith 轨迹**（最快）：
   - `curl -N -X POST http://127.0.0.1:8000/api/chat/stream -H "Content-Type: application/json" -d '{"query":"<问题>","history":[]}'`
   - LangSmith 后台（newking-agent 项目）看完整轨迹：模型是否调了工具？检索返回什么？模型输出什么？
2. **分环节验证**：
   - 检索准不准：`search('<问题>')` 看返回的 score 和 doc_id 是否相关。
   - 模型判断对不对：看工具该不该触发。
3. **环境检查**（先确认，避免误判为逻辑 bug）：
   - 隧道：`nc -z -w 3 127.0.0.1 5432`；后端：`curl :8000/health`
4. **改后验证**：跑「场景矩阵」确认无回归：
   写代码/闲聊/你是谁 → 不触发工具；技术栈/Tailwind/warp/读书/项目 → 触发工具。

## 11. 常见问题

- `Connection refused` / 对话一直卡在"知识库检索"：**SSH 隧道断了**，重开（见第 7 节）。
- `extension "vector" is not available`：pgvector 没装好（服务器 Postgres 手动复制过插件文件，见部署）。
- 数据库连不上/鉴权失败：检查 `.env` 的 `DATABASE_URL`（用户名/密码/库名要对上 1Panel）。
- 改代码后没生效：uvicorn 若没用 `--reload` 启动，需手动重启进程。
- LangSmith 连不上 403：检查 `.env` 的 `LANGSMITH_ENDPOINT`（国内账号多在 eu 区）。
