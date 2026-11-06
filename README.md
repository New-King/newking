# New-King

内容优先的个人网站：左侧目录像编辑器一样浏览博客/笔记/项目，右下角随时呼出 AI 分身，回答关于网站主人和站内内容的问题。

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

> 前端内容来自后端 `/api/content`；只启动前端会显示「内容加载失败」，需要同时启动后端。
> 对话检索还需要先开 SSH 隧道连服务器数据库（`backend/README.md` 第 7 节）。

## 目录结构

```
newking/
├── content/             内容源（博客/笔记/项目/about/contact/resume，md + frontmatter）
├── public/versions/     历史版本截图 + manifest.json（静态归档，详见 docs/版本历史.md）
├── backend/             后端（Python Agent 服务，详见 backend/README.md）
├── src/                 前端 React
│   ├── data/mockData.js 日期工具 + 站点文案（内容本身已由后端 API 提供）
│   ├── api.js           后端 API 封装
│   ├── hooks/
│   │   ├── useContent.js  内容数据 hook（页面从 /api/content 拉数据）
│   │   └── useChat.js     SSE 流式 / 历史持久化 / 暂停清空（与 UI 解耦）
│   ├── components/
│   │   ├── layout/       AppLayout + Sidebar + VersionNav（桌面目录 / 移动端抽屉 / 历史模式）
│   │   ├── chat/         ChatDock（右下角 AI 浮层）+ ChatDockContext
│   │   │                 MessageItem / blocks / BgGrid
│   │   ├── ContentDetail.jsx  文章详情页（markdown 渲染 + AI 摘要入口）
│   │   └── PageShell.jsx      页面统一布局
│   └── pages/            概览 + 博客/笔记/项目/关于/简历/联系 + HistoryPage（版本历史）
├── docs/                前端规则 / 设计规范 / 部署指南
└── AGENTS.md            项目约定（Agent 总规则 + 分派指引）
```

## 说明

- **首页 = 内容概览**：个人名片、最近更新（跨博客/笔记/项目混排）、三个分类入口。聊天不再占一级入口。
- **左侧目录**：按「关于 / 写作 / 作品」组织，可折叠；点击条目直接进入内容；`⌘K` / `Ctrl+K` 聚焦标题搜索；移动端为抽屉。
- **右下角 AI 浮层** = Agent 数字分身：模型通过 **function calling 自主决定**是否检索知识库，
  检索结果流式返回（思考 → 工具卡片 → 文字 → 媒体块 → 链接）。
- 文章页的「AI 摘要」会把预设问题带进浮层；对话历史存 localStorage，刷新不丢。
- **版本历史**：侧栏顶部历史按钮进入 `/history`，按版本 / 页面 / 桌面·手机查看静态截图；
  新增版本只需往 `public/versions/` 加图片并更新 `manifest.json`，不需要后端（详见 `docs/版本历史.md`）。
- 博客/笔记/项目/关于/简历/联系页数据都来自后端 `/api/content`（由 `content/*.md` 生成）。
- 编辑 `content/` 下任意 md → push 后自动上线 + 进 Agent 知识库（详见 `docs/部署指南.md`）。
- 后端架构、检索策略、调试见 `backend/README.md`。

## 常用命令

```bash
npm run dev / npm run build / npm run preview   # 前端
uvicorn agent.app:app --reload --port 8000       # 后端
```
