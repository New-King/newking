// 站点文案与日期工具。
// 博客/笔记/项目的正文与列表数据统一来自后端 /api/content，不再在前端写死。

export const SITE_QUOTE =
  '道阻且长，行则将至。';

// 列表/详情用：始终带年份
export function formatDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  if (!y || !m || !d) return '';
  return `${y}/${m}/${d}`;
}

// 按年份分组（降序），供博客/笔记页的年份分区列表使用
export function groupByYear(items) {
  const sorted = [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const groups = [];
  for (const item of sorted) {
    const year = String(item.date || '').slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(item);
    else groups.push({ year, items: [item] });
  }
  return groups;
}
