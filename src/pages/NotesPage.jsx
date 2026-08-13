import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { notes } from '../data/mockData';

// 短日期：2026-08-01 → 08/01
const formatDate = (iso) => {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
};

export default function NotesPage() {
  // 按年份分组（同博客页）：最新年份平铺，往年显示大字号右对齐年份标题
  const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
  const groups = [];
  for (const n of sorted) {
    const year = n.date.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(n);
    else groups.push({ year, items: [n] });
  }

  return (
    <PageShell eyebrow="Notes">
      {groups.map((g, i) => (
        <section key={g.year} className={i > 0 ? 'mt-16' : ''}>
          {/* 仅往年显示年份标题（changelog 惯例，同博客页） */}
          {i > 0 && (
            <h2 className="mb-4 text-right text-[28px] font-bold tracking-tight text-ink">
              {g.year}
            </h2>
          )}
          {/* 轻量双列卡片：标题 + 摘要 + 日期（移动端单列） */}
          <div className="grid gap-4 sm:grid-cols-2">
            {g.items.map((n) => (
              <Link
                key={n.id}
                to={n.to}
                className="group rounded-lg border border-black/[0.06] bg-card p-5 transition-colors duration-200 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[15px] font-medium leading-snug text-ink">
                    {n.title}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-ink-faint">
                    {formatDate(n.date)}
                  </p>
                </div>
                {n.excerpt && (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
                    {n.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </PageShell>
  );
}
