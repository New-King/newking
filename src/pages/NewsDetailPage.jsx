import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { formatDate } from '../data/mockData';
import { MOCK_NEWS } from '../data/mockNews';
import { IconChevron } from '../components/icons';

const BACK_BUTTON =
  'inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-card/60 px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:bg-card hover:text-ink dark:border-white/[0.1] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]';

export default function NewsDetailPage() {
  const { id } = useParams();
  const digest = MOCK_NEWS.find((item) => item.id === id);
  const index = MOCK_NEWS.findIndex((item) => item.id === id);
  // MOCK_NEWS 按日期倒序：后一条是上一期，前一条是下一期
  const older = index >= 0 ? MOCK_NEWS[index + 1] : null;
  const newer = index > 0 ? MOCK_NEWS[index - 1] : null;

  return (
    <PageShell
      toolbar={
        <Link to="/news" className={`${BACK_BUTTON} -ml-1`}>
          <IconChevron className="h-3.5 w-3.5 rotate-180" />
          返回新闻
        </Link>
      }
    >
      {!digest ? (
        <div className="py-8">
          <p className="text-sm text-ink-faint">未找到该日报。</p>
          <Link to="/news" className="mt-3 inline-block text-sm text-ink underline">
            返回新闻
          </Link>
        </div>
      ) : (
        <>
          <img
            src={digest.cover}
            alt={digest.title}
            className="mt-2 aspect-[16/9] w-full rounded-2xl object-cover"
          />
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium tracking-[0.12em] text-ink-faint">
            <span>AI 日报</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(digest.date)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{digest.items.length} 条</span>
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{digest.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{digest.summary}</p>

          <div className="mt-8 space-y-8">
            {digest.items.map((item) => (
              <article
                key={item.id}
                className="border-t border-black/[0.06] pt-6 dark:border-white/[0.08]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="min-w-0 text-[17px] font-semibold leading-snug text-ink">
                    {item.title}
                  </h2>
                  <span className="shrink-0 text-[11px] text-ink-faint">{item.source}</span>
                </div>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="mt-4 aspect-[16/9] w-full rounded-xl object-cover"
                  />
                )}
                <p className="mt-3 text-[14px] leading-7 text-ink-soft">{item.summary}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-ink-muted underline decoration-black/10 underline-offset-4 transition-colors hover:text-ink dark:decoration-white/15"
                >
                  原文 ↗
                </a>
              </article>
            ))}
          </div>

          {(older || newer) && (
            <nav className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-6 text-[13px] dark:border-white/[0.08]">
              {older ? (
                <Link
                  to={`/news/${older.id}`}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  ← 上一期 · {formatDate(older.date)}
                </Link>
              ) : (
                <span />
              )}
              {newer ? (
                <Link
                  to={`/news/${newer.id}`}
                  className="ml-auto text-ink-muted transition-colors hover:text-ink"
                >
                  下一期 · {formatDate(newer.date)} →
                </Link>
              ) : null}
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
