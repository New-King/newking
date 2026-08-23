import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { formatDate, groupByYear } from '../data/mockData';
import { useContent } from '../hooks/useContent';

export default function NotesPage() {
  const { data, loading } = useContent();
  const notes = data?.notes ?? [];
  // 按年份分组（同博客页）：最新年份平铺，往年显示大字号右对齐年份标题
  const groups = groupByYear(notes);

  return (
    <PageShell eyebrow="Notes">
      {loading ? (
        <p className="py-8 text-sm text-ink-faint">加载中…</p>
      ) : (
        groups.map((g, i) => (
        <section key={g.year} className={i > 0 ? 'mt-16' : ''}>
          {/* 【临时】最新年份分区也显示右侧年份大标题（如 2046）；恢复 changelog 惯例：改回 i > 0 */}
          {(true /* ORIGINAL: i > 0 */) && (
            <h2 className="mb-4 text-right text-[28px] font-bold tracking-tight text-ink">
              {g.year}
            </h2>
          )}
          {/* 轻量双列卡片：标题 + 摘要 + 日期（移动端单列） */}
          <div className="grid gap-4 sm:grid-cols-2">
            {g.items.map((n) => (
              <Link key={n.id} to={n.to} className="list-card group">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-[15px] font-medium leading-snug text-ink">
                    {n.title}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-ink-muted">
                    {formatDate(n.date)}
                  </p>
                </div>
                {n.excerpt && (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {n.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
        ))
      )}
    </PageShell>
  );
}
