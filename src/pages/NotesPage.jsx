import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { formatDate } from '../data/mockData';
import { groupNotes, sortNotes } from '../utils/contentOrder';
import { useContent } from '../hooks/useContent';

export default function NotesPage() {
  const { data, loading, error } = useContent();
  const notes = useMemo(() => sortNotes(data?.notes ?? []), [data]);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      q
        ? notes.filter((n) =>
            [n.title, n.excerpt].some((text) =>
              String(text || '').toLowerCase().includes(q)
            )
          )
        : notes,
    [notes, q]
  );
  const groups = useMemo(() => groupNotes(filtered), [filtered]);
  const hasResults = groups.series.length > 0 || groups.years.length > 0;

  return (
    <PageShell
      wide
      toolbar={
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder="搜索标题…"
          aria-label="搜索标题"
          className="w-44 rounded-lg border border-black/[0.06] bg-card/70 px-3 py-1.5 text-[12px] text-ink outline-none transition-shadow duration-200 placeholder:text-ink-faint focus:shadow-apple-input sm:w-56 dark:border-white/[0.08] dark:bg-white/[0.04]"
        />
      }
    >
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">笔记</h1>
      <div className="mt-6">
        {loading ? (
          <p className="py-8 text-sm text-ink-faint">加载中…</p>
        ) : error ? (
          <p className="py-8 text-sm text-ink-faint">内容加载失败，请确认后端服务已启动。</p>
        ) : q ? (
          filtered.length === 0 ? (
            <p className="py-8 text-sm text-ink-faint">没有匹配的内容</p>
          ) : (
            /* 搜索结果：平铺，不显示系列序号 */
            <ul className="space-y-px">
              {filtered.map((n) => (
                <li key={n.id}>
                  <Link to={n.to} className="list-card group">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[15px] leading-snug text-ink">{n.title}</p>
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
                </li>
              ))}
            </ul>
          )
        ) : !hasResults ? (
          <p className="py-8 text-sm text-ink-faint">还没有内容。</p>
        ) : (
          <>
            {/* 系列笔记：按学习顺序单列展示 */}
            {groups.series.map((group, gi) => (
              <section key={group.key} className={gi > 0 ? 'mt-16' : ''}>
                <div className="flex items-baseline justify-between gap-3 border-b border-black/[0.08] pb-3 dark:border-white/[0.08]">
                  <h2 className="text-[13px] font-medium text-ink">{group.name}</h2>
                  <span className="text-[11px] tabular-nums text-ink-faint">
                    {group.items.length}
                  </span>
                </div>
                <ul>
                  {group.items.map((n, index) => (
                    <li key={n.id}>
                      <Link
                        to={n.to}
                        className="group flex items-start gap-4 border-b border-black/[0.05] py-3.5 dark:border-white/[0.06]"
                      >
                        <span className="w-7 shrink-0 pt-0.5 text-[11px] tabular-nums text-ink-faint">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] leading-snug text-ink">{n.title}</p>
                          {n.excerpt && (
                            <p className="mt-1 text-[13px] leading-6 text-ink-muted">
                              {n.excerpt}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-ink-faint">
                          {formatDate(n.date)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {/* 非系列笔记：沿用按年份的双列卡片 */}
            {groups.years.map((g, i) => (
              <section
                key={g.year}
                className={groups.series.length > 0 || i > 0 ? 'mt-16' : ''}
              >
                {(i > 0 || groups.series.length > 0) && (
                  <h2 className="mb-4 text-right text-[28px] font-bold tracking-tight text-ink">
                    {g.year}
                  </h2>
                )}
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
            ))}
          </>
        )}
      </div>
    </PageShell>
  );
}
