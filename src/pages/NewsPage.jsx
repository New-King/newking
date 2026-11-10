import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { formatDate } from '../data/mockData';
import { MOCK_NEWS } from '../data/mockNews';
import { IconChevron } from '../components/icons';

const PAGE_SIZE = 8;

const formatMonth = (value) => {
  const [year, month] = value.split('-');
  return `${year} 年 ${Number(month)} 月`;
};

const shiftDay = (date, delta) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

export default function NewsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const latest = MOCK_NEWS[0];
  const digest = id ? MOCK_NEWS.find((item) => item.id === id) : latest;

  const [archiveMonth, setArchiveMonth] = useState(() =>
    (digest?.date || latest.date).slice(0, 7)
  );
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const months = useMemo(
    () => [...new Set(MOCK_NEWS.map((item) => item.date.slice(0, 7)))],
    []
  );

  // 今天/昨天/前天：以最新一期为锚点，保证进来先看到今天的日报
  const dayOptions = useMemo(
    () =>
      [
        { label: '今天', date: latest.date },
        { label: '昨天', date: shiftDay(latest.date, -1) },
        { label: '前天', date: shiftDay(latest.date, -2) },
      ].map((item) => ({
        ...item,
        digest: MOCK_NEWS.find((entry) => entry.id === item.date),
      })),
    [latest.date]
  );

  // 日期变化时，归档自动跟随到该月，并展开到当前选中日可见
  useEffect(() => {
    if (!digest) return;
    const month = digest.date.slice(0, 7);
    setArchiveMonth(month);
    const monthItems = MOCK_NEWS.filter((item) => item.date.startsWith(month));
    const index = monthItems.findIndex((item) => item.id === digest.id);
    setVisibleCount(Math.max(PAGE_SIZE, index + 1));
  }, [digest?.id]);

  const archiveFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_NEWS.filter((item) => {
      if (!item.date.startsWith(archiveMonth)) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.summary,
        ...item.items.map((entry) => `${entry.title} ${entry.summary}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [archiveMonth, query]);

  const archiveVisible = archiveFiltered.slice(0, visibleCount);
  const hasMore = archiveVisible.length < archiveFiltered.length;

  const selectMonth = (value) => {
    setArchiveMonth(value);
    setVisibleCount(PAGE_SIZE);
    if (digest && !digest.date.startsWith(value)) {
      const first = MOCK_NEWS.find((item) => item.date.startsWith(value));
      if (first) navigate(`/news/${first.id}`);
    }
  };

  const lead = digest?.items?.[0];
  const others = digest?.items?.slice(1) ?? [];
  const isLatest = digest?.id === latest.id;

  return (
    <PageShell wide>
      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">新闻</h1>
        <p className="mt-1 text-[11px] font-medium tracking-[0.14em] text-ink-faint">
          AI 日报 · 按日期浏览
        </p>
      </div>

      {!digest ? (
        <div className="py-10">
          <p className="text-sm text-ink-faint">未找到该日报。</p>
          <Link to="/news" className="mt-3 inline-block text-sm text-ink underline">
            返回今日新闻
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
            <p className="text-[11px] font-medium tracking-[0.14em] text-ink-faint">
              AI 日报 · {formatDate(digest.date)}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {dayOptions.map((option) => {
                if (!option.digest) {
                  return (
                    <span
                      key={option.label}
                      className="rounded-full px-3 py-1.5 text-[12px] text-ink-faint opacity-40"
                    >
                      {option.label}
                    </span>
                  );
                }
                const active = option.digest.id === digest.id;
                return (
                  <Link
                    key={option.label}
                    to={`/news/${option.digest.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors duration-200 ${
                      active
                        ? 'bg-black/[0.06] font-medium text-ink dark:bg-white/10'
                        : 'text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    {option.label}
                    <span className="tabular-nums text-ink-faint">
                      {formatDate(option.date).slice(5)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 今日最重要的一条 */}
          <div className="mt-5 grid overflow-hidden rounded-2xl surface-elevated lg:grid-cols-[1.05fr_0.95fr]">
            <div className="aspect-[16/10] overflow-hidden bg-page lg:aspect-auto lg:h-full">
              <img
                src={lead?.image || digest.cover}
                alt={lead?.title || digest.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium tracking-[0.12em] text-ink-faint">
                {isLatest && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-ink-muted dark:bg-white/10">
                    今日
                  </span>
                )}
                <span className="tabular-nums">{formatDate(digest.date)}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{digest.items.length} 条</span>
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-ink lg:text-[28px]">
                {lead?.title || digest.title}
              </h2>
              <p className="mt-2 max-w-[460px] text-[14px] leading-7 text-ink-soft">
                {lead?.summary || digest.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] text-ink-muted">
                {lead?.source && <span>{lead.source}</span>}
                {lead?.url && (
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-black/10 underline-offset-4 transition-colors hover:text-ink dark:decoration-white/15"
                  >
                    原文 ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 今天其他新闻 */}
          {others.length > 0 && (
            <section className="mt-10">
              <h2 className="text-[13px] font-medium text-ink">
                {isLatest ? '今日其他' : '其他更新'}
              </h2>
              <div className="mt-3 overflow-hidden rounded-2xl bg-black/[0.025] dark:bg-white/[0.04]">
                <ul>
                  {others.map((item, index) => (
                    <li
                      key={item.id}
                      className={
                        index > 0
                          ? 'border-t border-black/[0.05] dark:border-white/[0.07]'
                          : ''
                      }
                    >
                      <div className="flex items-start gap-4 px-4 py-4 sm:px-5 sm:py-5">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-ink">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-[13px] leading-6 text-ink-soft">
                            {item.summary}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-ink-faint">
                            <span>{item.source}</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline decoration-black/10 underline-offset-4 transition-colors hover:text-ink dark:decoration-white/15"
                            >
                              原文 ↗
                            </a>
                          </div>
                        </div>
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-16 w-24 shrink-0 rounded-lg object-cover"
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* 按月归档 */}
          <section className="mt-16 border-t border-black/[0.06] pt-8 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[13px] font-medium text-ink">归档</h2>
                <p className="mt-1 text-[11px] text-ink-faint">按月份浏览往期日报</p>
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

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {months.map((value) => {
                const active = value === archiveMonth;
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

            {archiveFiltered.length === 0 ? (
              <p className="py-8 text-sm text-ink-faint">没有匹配的内容</p>
            ) : (
              <>
                <div className="mt-5 overflow-hidden rounded-2xl bg-black/[0.025] dark:bg-white/[0.04]">
                  <ul>
                    {archiveVisible.map((item, index) => {
                      const active = item.id === digest.id;
                      return (
                        <li
                          key={item.id}
                          className={
                            index > 0
                              ? 'border-t border-black/[0.05] dark:border-white/[0.07]'
                              : ''
                          }
                        >
                          <Link
                            to={`/news/${item.id}`}
                            aria-current={active ? 'page' : undefined}
                            className={`group flex items-center gap-3 px-4 py-4 transition-colors duration-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] sm:gap-4 sm:px-5 ${
                              active ? 'bg-black/[0.03] dark:bg-white/[0.05]' : ''
                            }`}
                          >
                            <div className="aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-black/[0.04] dark:bg-white/[0.06] sm:w-24">
                              <img
                                src={item.cover}
                                alt={item.title}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium tracking-[0.1em] text-ink-faint">
                                <span>AI 日报</span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{formatDate(item.date)}</span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{item.items.length} 条</span>
                              </p>
                              <h3 className="mt-1 text-[15px] font-semibold leading-snug tracking-tight text-ink">
                                {item.title}
                              </h3>
                              <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-5 text-ink-muted">
                                {item.summary}
                              </p>
                            </div>
                            <IconChevron className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
                          </Link>
                        </li>
                      );
                    })}
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
          </section>
        </>
      )}
    </PageShell>
  );
}
