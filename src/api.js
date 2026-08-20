// 后端 API 封装：前端所有数据请求都从这里走。
// 开发期 Vite 代理把 /api/* 转发到 Python(8000)；生产由网关托管同路径。

// 全站内容内存缓存：一次拉取，全局共享。
// 各页面组件各自调用 useContent()，若不缓存会每次切换菜单都重新 fetch(/api/content)。
// 用模块级变量 + Promise 复用：首次请求后缓存，后续直接返回同一份数据；
// 并发调用共享同一个 pending Promise，避免重复请求。
let _contentCache = null; // 已完成的 Promise

// 拉取全站内容（博客/笔记/项目/about/contact/resume）
export function fetchContent() {
  // 已有缓存（含进行中的 Promise）则直接复用
  if (_contentCache) return _contentCache;
  _contentCache = fetch('/api/content')
    .then((res) => {
      if (!res.ok) throw new Error(`内容接口失败: ${res.status}`);
      return res.json();
    })
    .catch((e) => {
      _contentCache = null; // 失败后清缓存，下次可重试
      throw e;
    });
  return _contentCache;
}

// 内容 API 的返回结构：
// { posts: [...], notes: [...], projects: [...], about: {...}, contact: {...}, resume: {...} }
// 每个列表项：{ id, title, date, description, cover, video, links, content }
