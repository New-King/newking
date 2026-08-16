import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { formatDate, groupByYear } from '../data/mockData';
import { useContent } from '../hooks/useContent';

export default function BlogPage() {
  const { data, loading } = useContent();
  const posts = data?.posts ?? [];
  // 按年份分组，年份降序、组内日期降序
  const groups = groupByYear(posts);

  return (
    <PageShell eyebrow="Blog">
      {loading ? (
        <p className="py-8 text-sm text-ink-faint">加载中…</p>
      ) : (
        groups.map((g, i) => (
        <section key={g.year} className={i > 0 ? 'mt-16' : ''}>
          {/* 仅往年显示年份标题；最新年份平铺，年份不言自明（changelog 惯例） */}
          {i > 0 && (
            <h2 className="mr-[-3px] text-right text-[28px] font-bold tracking-tight text-ink">
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
                  {/* 标题行：标题左、日期右，两端对齐 */}
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[16px] leading-snug text-ink">
                      {p.title}
                    </p>
                    <p className="shrink-0 text-xs tabular-nums text-ink-faint">
                      {formatDate(p.date)}
                    </p>
                  </div>
                  {p.excerpt && (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
                      {p.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        ))
      )}
    </PageShell>
  );
}
