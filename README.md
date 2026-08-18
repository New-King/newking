# New-King

以「对话」为入口的个人网站：首页有一个代表"本人"的数字分身 Agent，回答关于网站主人与网站内容（博客/笔记/项目）的问题。

## 技术栈

- **前端**：React 18 · Vite · Tailwind CSS · react-router-dom
- **后端**：Python（FastAPI + LangChain）· 服务器 Postgres(pgvector)
- **AI**：DeepSeek（对话 + function calling）· SiliconFlow bge-large-zh-v1.5（embedding）· LangSmith（追踪）
- 内容源：`content/*.md`（git 即唯一内容源，编辑 md 即更新网站与 Agent）

## 快速开始

```bash
# 前端
npm install
npm run dev        # 打开 http://localhost:5175

# 后端（另开终端，详见 backend/README.md）
cd backend && ../.venv/bin/uvicorn agent.app:app --reload --port 8000
```

> 后端需先开 SSH 隧道连服务器数据库（`backend/README.md` 第 7 节）。

## 目录结构

```
newking/
├── content/             内容源（博客/笔记/项目/about/contact/resume，md + frontmatter）
├── backend/             后端（Python Agent 服务，详见 backend/README.md）
├── src/                 前端 React
│   ├── data/mockData.js 日期分组工具 + 站点文案（内容本身已由后端 API 提供）
│   ├── api.js           后端 API 封装
│   ├── hooks/useContent.js  内容数据 hook（页面从 /api/content 拉数据）
│   ├── components/
│   │   ├── Navbar.jsx   顶部导航（hover 下拉：最新内容/联系，数据来自 API）
│   │   ├── ContentDetail.jsx  文章详情页（markdown 渲染）
│   │   ├── PageShell.jsx      页面统一布局
│   │   └── chat/        首页对话引擎
│   │       ├── AgentChat.jsx  对话容器（SSE 流式 + 状态机 + 轮播）
│   │       ├── MessageItem.jsx 消息气泡 + 相关文章/引用关联
│   │       ├── blocks.jsx     内容块渲染（思考/工具/文字/图/链接，含 markdown 与引用标签）
│   │       ├── CodeBlock.jsx / Typewriter.jsx / TurnRail.jsx / BgGrid.jsx
│   └── pages/           首页 + 博客/项目/笔记/联系页
├── docs/                前端规则 / 设计规范 / 部署指南
└── AGENTS.md            项目约定（Agent 总规则 + 分派指引）
```

## 说明

- 首页对话 = Agent 数字分身：模型通过 **function calling 自主决定**是否检索知识库，
  检索结果流式返回（思考 → 工具卡片 → 文字 → 媒体块 → 引用）。
- 博客/项目/笔记页 + 导航悬停下拉，数据都来自后端 `/api/content`（由 `content/*.md` 生成）。
- 编辑 `content/` 下任意 md → push 后自动上线 + 进 Agent 知识库（详见 `docs/部署指南.md`）。
- 后端架构、检索策略、调试见 `backend/README.md`。

## 常用命令

```bash
npm run dev / npm run build / npm run preview   # 前端
uvicorn agent.app:app --reload --port 8000       # 后端
```
