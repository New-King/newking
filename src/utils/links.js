// 站内链接识别：把「本站 / 站内文章」的 URL 归一化成 SPA 路径。
// 内容里的 url 是 https://new-king.com/blog/xxx 这类绝对地址，
// 在本地开发（localhost）下也要能识别为站内，避免新开标签页或跳回线上站。
const SITE_HOSTS = new Set(['new-king.com', 'www.new-king.com']);

/**
 * 站内链接 → 可直接交给 react-router 的路径；站外 / 非 http 链接返回 null。
 */
export function toInternalPath(href) {
  if (!href) return null;
  // 纯锚点交给浏览器默认行为
  if (href.startsWith('#')) return null;

  try {
    const url = new URL(href, window.location.origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const isInternal =
      url.origin === window.location.origin || SITE_HOSTS.has(url.hostname);
    if (!isInternal) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
