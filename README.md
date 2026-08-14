# New-King

以「对话」为入口的个人网站

技术栈：React 18 · Vite · Tailwind CSS · react-router-dom（JavaScript / JSX，纯前端，无后端）。

## 快速开始

```bash
npm install
npm run dev        # 打开 http://localhost:5173
```

其他命令：`npm run build` / `npm run preview`。

## 目录结构

```
src/
  data/mockData.js         全站本地 mock 数据与日期分组
  components/
    Navbar.jsx             顶部居中导航 + hover 下拉面板（日期分组展示）
    icons.jsx              内联 SVG 图标
    PageShell.jsx          占位页统一布局
    chat/
      AgentChat.jsx        首页 Agent 对话容器（初始态→对话态过渡、mock 回复调度）
      MessageItem.jsx      极简气泡（AI 居左 / 用户居右）
      blocks.jsx           内容块：思考 / 工具调用 / 流式文字 / 图片 / 音频 / 视频（含骨架屏）
      CodeBlock.jsx        代码块（highlight.js 高亮 + 复制按钮）
      Typewriter.jsx       打字机逐字输出
  pages/                   首页与四个占位页（博客 / 项目 / 笔记 / 联系）
```

## 说明

- 所有数据均为本地 mock，无任何后端、API 或存储。
- 首页输入任意内容后回车 / 点击发送，即会播放一条演示回复，依次展示：
  思考过程（可折叠）、工具调用（进行中 → 完成）、流式文字（打字机）、
  图片、代码块（高亮 + 复制）、音频与视频占位。
- 导航悬停下拉：同一天的多条内容按日期分组，日期只显示一次。
