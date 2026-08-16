// 后端 API 封装：前端所有数据请求都从这里走。
// 开发期 Vite 代理把 /api/* 转发到 Python(8000)；生产由网关托管同路径。

// 拉取全站内容（博客/笔记/项目/about/contact/resume）
export async function fetchContent() {
  const res = await fetch('/api/content');
  if (!res.ok) throw new Error(`内容接口失败: ${res.status}`);
  return res.json();
}

// 内容 API 的返回结构：
// { posts: [...], notes: [...], projects: [...], about: {...}, contact: {...}, resume: {...} }
// 每个列表项：{ id, title, date, description, cover, video, links, content }
