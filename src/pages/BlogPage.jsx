import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { posts } from '../data/mockData';

// 按月份分组（2026-07 → "2026年7月"），倒序
function groupByMonth(items) {
  const map = new Map();
  for (const it of items) {
    const month = it.date.slice(0, 7); // YYYY-MM
    if (!map.has(month)) map.set(month, []);
    map.get(month).push(it);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default function BlogPage() {
  const groups = groupByMonth(posts);
  return (
    <PageShell eyebrow="Blog" note="内容筹备中 · 悬停顶部导航可预览最新文章">
      {/* 文章列表：按月份分组（月份为小节标题），文章不再重复显示日期，保持简约 */}
      <div className="space-y-9">
        {groups.map(([month, items]) => (
          <section key={month}>
            <h2 className="text-xs font-medium tracking-[0.18em] text-ink-faint">
              {`${month.slice(0, 4)}年${Number(month.slice(5))}月`}
            </h2>
            <ul className="mt-3 divide-y divide-black/[0.06] dark:divide-white/10">
              {items.map((p) => (
                <li key={p.id}>
                  <Link to={p.to} className="group flex items-baseline gap-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-[15px] text-ink-soft transition-colors duration-200 group-hover:text-ink">
                      {p.title}
                    </span>
                    <span className="shrink-0 text-sm text-ink-faint opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
