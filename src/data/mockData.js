import demoImg from '../assets/demo.svg';

// 全站本地 mock 数据 —— 纯前端，无任何后端依赖。

// 悬停导航「首页」时展示的站点文案（可配置）
export const SITE_QUOTE =
  '在AI极速发展的时代，任何你觉得了不起的新奇想法，都会在第二天怦然坠地。';

export const posts = [
  {
    id: 'p1',
    title: '构建可组合的 Agent 工作流',
    date: '2026-07-28',
    excerpt: '拆解 Agent 的组成单元，分享可复用工作流的搭建思路与实践。',
    to: '/blog',
  },
  {
    id: 'p2',
    title: 'RAG 落地实践：从原型到生产',
    date: '2026-07-20',
    excerpt: '从检索方案选型到线上稳定运行，记录 RAG 服务化的关键决策。',
    to: '/blog',
  },
  {
    id: 'p3',
    title: '用 React 与 Vite 搭建现代前端',
    date: '2026-07-12',
    excerpt: 'Vite 冷启动与 React 工程化的取舍，以及项目结构的演进。',
    to: '/blog',
  },
  {
    id: 'p4',
    title: '关于 LLM 上下文工程的一些思考',
    date: '2026-07-12',
    excerpt: '上下文窗口的分配、压缩与检索，如何让模型用得更省。',
    to: '/blog',
  },
  {
    id: 'p5',
    title: '2026 年中技术盘点',
    date: '2026-06-30',
    excerpt: '半年技术观察：Agent、推理模型与工程工具的进展。',
    to: '/blog',
  },
  {
    id: 'p6',
    title: '个人网站搭建的早期探索',
    date: '2025-08-27',
    excerpt: '从零搭建个人站：技术选型、设计取舍与踩坑记录。',
    to: '/blog',
  },
];

export const projects = [
  {
    id: 'j1',
    title: 'Agent Console — 对话式运维助手',
    date: '2026-06-15',
    description: '对话式 AI 运维终端，聚合日志、指标与操作指令。',
    cover: 'ring',
    to: '/projects',
  },
  {
    id: 'j2',
    title: 'Portfolio 生成器',
    date: '2026-05-02',
    description: '用 JSON 配置快速生成个人作品集站点。',
    cover: 'square',
    to: '/projects',
  },
  {
    id: 'j3',
    title: '知识库检索服务',
    date: '2026-03-18',
    description: 'RAG 驱动的文档检索 API，支持多种向量库接入。',
    cover: 'dots',
    to: '/projects',
  },
  {
    id: 'j4',
    title: '微前端脚手架',
    date: '2026-03-18',
    description: '基于模块联邦的微前端工程模板与发布工具。',
    cover: 'cross',
    to: '/projects',
  },
  {
    id: 'j5',
    title: '命令行效率工具集',
    date: '2026-01-20',
    description: '一组提升日常开发效率的 CLI 小工具。',
    cover: 'triangle',
    to: '/projects',
  },
];

export const notes = [
  { id: 'n1', title: '关于 prompt 工程的一点心得', date: '2026-08-01', to: '/notes' },
  { id: 'n2', title: 'Tailwind 排版与间距的取舍', date: '2026-07-25', to: '/notes' },
  { id: 'n3', title: '读《设计中的设计》', date: '2026-07-10', to: '/notes' },
  { id: 'n4', title: 'MCP 协议初探', date: '2026-07-10', to: '/notes' },
  { id: 'n5', title: '每周速览 #12', date: '2026-06-28', to: '/notes' },
];

// 示例联系方式
export const contact = {
  phone: '138-0000-0000',
  email: 'hello@example.com',
};

// ---- 日期分组 ----

export function formatDateShort(iso) {
  const [, m, d] = iso.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

// 取最新 n 条；同一天的内容合并为一组，日期只显示一次，不拆开。
export function latestGroups(items, n = 3) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const groups = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  const picked = [];
  let count = 0;
  for (const g of groups) {
    picked.push(g);
    count += g.items.length;
    if (count >= n) break;
  }
  return picked;
}

// ---- Agent 演示回复（一条回复同时演示多种内容类型）----

export const DEMO_TOOLS = [
  { name: '搜索', duration: 1100, result: '检索到 3 篇相关文章' },
  { name: '知识库', duration: 900, result: '命中 12 条相关片段' },
  { name: 'MCP 插件', duration: 700, result: '已连接 2 个可用工具' },
];

export const DEMO_TEXT =
  '你好，我是这个网站内置的演示 Agent。\n\n基于对站内内容的检索，我为你整理了如下结论：\n\n这是一个以「对话」为入口的个人网站 —— 顶部导航承载博客、项目、笔记与联系方式，悬停即可预览最新内容；首页则用一次对话来演示 Agent 的完整能力。\n\n下面是本次回复使用的示例代码、示意图与媒体占位，方便你快速评估整体效果。';

export const DEMO_CODE = `// 演示：模拟 Agent 流式回复的调度器
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function streamReply({ blocks, onBlock }) {
  for (const block of blocks) {
    onBlock({ type: 'loading', ...block });
    await sleep(block.duration);
    onBlock({ type: 'done', ...block });
  }
}

streamReply({
  blocks: [
    { type: 'thinking', duration: 600 },
    { type: 'tool', name: '知识库', duration: 900 },
  ],
  onBlock: (b) => render(b),
});`;

export const DEMO_IMAGE = {
  src: demoImg,
  caption: '示意图 · 对话式首页的布局结构',
};

export const DEMO_AUDIO = {
  title: '演示音频 · 设计思路漫谈',
  duration: '03:24',
};

export const DEMO_VIDEO = {
  title: '演示视频 · 对话式入口 Demo',
  duration: '01:12',
};
