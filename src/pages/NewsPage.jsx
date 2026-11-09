import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { formatDate } from '../data/mockData';
import { MOCK_NEWS } from '../data/mockNews';
import { IconChevron } from '../components/icons';

const PAGE_SIZE = 8;

const formatMonth = (value) => {
  const [year, month] = value.split('-');
  return `${year} 年 ${Number(month)} 月`;
};

export default function NewsPage() {
  const months = useMemo(
    () => [...new Set(MOCK_NEWS.map((item) => item.date.slice(0, 7)))],
    []
  );
  const featured = MOCK_NEWS[0];
  const [month, setMonth] = useState(() => months[0] ?? '');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const searching = Boolean(query.trim());
  const showFeatured = !searching;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_NEWS.filter((digest) => {
      if (!digest.date.startsWith(month)) return false;
      if (!q) return true;
      const haystack = [
        digest.title,
        digest.summary,
        ...digest.items.map((item) => `${item.title} ${item.summary}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [month, query]);

  const archive = useMemo(
    () => filtered.filter((digest) => !(showFeatured && digest.id === featured.id)),
    [filtered, showFeatured, featured.id]
  );
  const visible = archive.slice(0, visibleCount);
  const hasMore = visible.length < archive.length;

  const selectMonth = (value) => {
    setMonth(value);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <PageShell wide>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">新闻</h1>
          <p className="mt-1 text-[11px] font-medium tracking-[0.14em] text-ink-faint">
            AI 日报 · 按月份归档
          </p>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="搜索标题…"
          aria-label="搜索标题"
          className="w-40 rounded-lg border border-black/[0.06] bg-card/70 px-3 py-1.5 text-[12px] text-ink outline-none transition-shadow duration-200 placeholder:text-ink-faint focus:shadow-apple-input sm:w-56 dark:border-white/[0.08] dark:bg-white/[0.04]"
        />
      </div>

      {showFeatured && (
        <Link
          to={`/news/${featured.id}`}
          className="group mt-8 grid overflow-hidden rounded-2xl surface-elevated lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="aspect-[16/10] overflow-hidden bg-page lg:aspect-auto lg:h-full">
            <img
              src={featured.cover}
              alt={featured.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex flex-col justify-center p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium tracking-[0.12em] text-ink-faint">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-ink-muted dark:bg-white/10">
                今日
              </span>
              <span className="tabular-nums">{formatDate(featured.date)}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{featured.items.length} 条</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-ink lg:text-[28px]">
              {featured.title}
            </h2>
            <p className="mt-2 max-w-[460px] text-[14px] leading-7 text-ink-soft">
              {featured.summary}
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-[12px] text-ink-muted transition-colors group-hover:text-ink">
              阅读今日日报
              <IconChevron className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      )}

      <div className="mt-16 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[13px] font-medium text-ink">归档</h2>
          <p className="mt-1 text-[11px] text-ink-faint">按月份浏览往期日报</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {months.map((value) => {
            const active = value === month;
            return (
              <button
                key={value}
                type="button"
                onClick={() => selectMonth(value)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-[12px] transition-colors duration-200 ${
                  active
                    ? 'bg-black/[0.06] font-medium text-ink dark:bg-white/10'
                    : 'text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]'
                }`}
              >
                {formatMonth(value)}
              </button>
            );
          })}
        </div>
      </div>

      {archive.length === 0 ? (
        <p className="py-8 text-sm text-ink-faint">没有匹配的内容</p>
      ) : (
        <>
          <div className="mt-5 overflow-hidden rounded-2xl bg-black/[0.025] dark:bg-white/[0.04]">
            <ul>
              {visible.map((digest, index) => (
                <li
                  key={digest.id}
                  className={
                    index > 0
                      ? 'border-t border-black/[0.05] dark:border-white/[0.07]'
                      : ''
                  }
                >
                  <Link
                    to={`/news/${digest.id}`}
                    className="group flex items-center gap-3 px-4 py-4 transition-colors duration-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] sm:gap-4 sm:px-5"
                  >
                    <div className="aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-black/[0.04] dark:bg-white/[0.06] sm:w-24">
                      <img
                        src={digest.cover}
                        alt={digest.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium tracking-[0.1em] text-ink-faint">
                        <span>AI 日报</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDate(digest.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{digest.items.length} 条</span>
                      </p>
                      <h3 className="mt-1 text-[15px] font-semibold leading-snug tracking-tight text-ink">
                        {digest.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-5 text-ink-muted">
                        {digest.summary}
                      </p>
                    </div>
                    <IconChevron className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {hasMore && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-card/60 px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:bg-card hover:text-ink dark:border-white/[0.1] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
              >
                加载更多
                <IconChevron className="h-3 w-3 rotate-90" />
              </button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
