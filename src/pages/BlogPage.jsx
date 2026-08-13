import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { posts } from '../data/mockData';

// 短日期：2026-07-28 → 07/28
const formatDate = (iso) => {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
};

export default function BlogPage() {
  // 按年份分组，年份降序、组内日期降序
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const groups = [];
  for (const p of sorted) {
    const year = p.date.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(p);
    else groups.push({ year, items: [p] });
  }

  return (
    <PageShell eyebrow="Blog" note="内容筹备中 · 悬停顶部导航可预览最新文章">
      {groups.map((g, i) => (
        <section key={g.year} className={i > 0 ? 'mt-16' : ''}>
          {/* 仅往年显示年份标题；最新年份平铺，年份不言自明（changelog 惯例） */}
          {i > 0 && (
            <h2 className="text-[28px] font-bold tracking-tight text-ink">
              {g.year}
            </h2>
          )}
          {/* 更新日志式列表：每条 = 标题 + MM/DD 日期，发丝分隔线 */}
          <ul className="divide-y divide-black/[0.06] dark:divide-white/15">
            {g.items.map((p) => (
              <li key={p.id}>
                <Link
                  to={p.to}
                  className="group -mx-3 block rounded-lg px-3 py-5 transition-colors duration-200 hover:bg-black/[0.04] dark:hover:bg-white/10"
                >
                  <p className="text-[16px] leading-snug text-ink">
                    {p.title}
                  </p>
                  <p className="mt-1.5 text-xs tabular-nums text-ink-faint">
                    {formatDate(p.date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
