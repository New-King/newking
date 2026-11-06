import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useVersions } from '../hooks/useVersions';
import { IconChevron } from '../components/icons';
import HistoryLightbox from '../components/layout/HistoryLightbox';

const DEVICES = [
  { key: 'desktop', label: '桌面' },
  { key: 'mobile', label: '手机' },
];

const defaultDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
    ? 'mobile'
    : 'desktop';

function HistoryState({ children }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-28 pt-8 sm:px-8 lg:px-12 lg:pt-12">
      <p className="text-sm leading-6 text-ink-faint">{children}</p>
    </div>
  );
}

export default function HistoryPage() {
  const { versionId, pageId } = useParams();
  const navigate = useNavigate();
  const { versions, loading, error } = useVersions();
  const [device, setDevice] = useState(defaultDevice);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const version = versionId
    ? versions.find((item) => item.id === versionId)
    : versions[0];

  const pages = version?.pages ?? [];
  const page = pages.find((item) => item.id === pageId) || pages[0];

  // 标题跟着版本走，离开时恢复
  useEffect(() => {
    if (!version) return undefined;
    const previous = document.title;
    document.title = `${version.title} · 版本历史 · New-King`;
    return () => {
      document.title = previous;
    };
  }, [version]);

  if (loading) return <HistoryState>加载历史版本…</HistoryState>;
  if (error) return <HistoryState>历史版本加载失败，请确认版本清单是否存在。</HistoryState>;
  if (versions.length === 0) return <HistoryState>还没有历史版本。</HistoryState>;
  if (!version) return <HistoryState>未找到该版本。</HistoryState>;
  if (!page) return <HistoryState>该版本还没有页面截图。</HistoryState>;

  const index = pages.indexOf(page);
  const prevPage = pages[index - 1];
  const nextPage = pages[index + 1];
  const isCurrent = version.id === versions[0]?.id;
  const shots = page.screenshots || {};
  const hasDesktop = Boolean(shots.desktop);
  const hasMobile = Boolean(shots.mobile);
  const effectiveDevice = shots[device]
    ? device
    : hasDesktop
      ? 'desktop'
      : 'mobile';
  const src = shots[effectiveDevice];
  const commitUrl = version.commit
    ? `https://github.com/New-King/newking/commit/${version.commit}`
    : null;
  const pageTo = (item) => `/history/${version.id}/${item.id}`;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-28 pt-8 sm:px-8 lg:px-12 lg:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">
          Version History
        </p>
        <Link
          to="/"
          className="text-[12px] text-ink-muted transition-colors hover:text-ink"
        >
          ← 返回当前站点
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{version.title}</h1>
            {isCurrent && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-ink-muted dark:bg-white/10">
                当前
              </span>
            )}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-faint">
            <span>{version.label || version.date}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{version.date}</span>
            {version.commit && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-ink-muted underline decoration-black/10 underline-offset-2 transition-colors hover:text-ink dark:decoration-white/15"
                >
                  {version.commit}
                </a>
              </>
            )}
          </p>
          {version.summary && (
            <p className="mt-3 max-w-2xl text-[14px] leading-7 text-ink-soft">{version.summary}</p>
          )}
        </div>

        <div className="inline-flex shrink-0 items-center self-start rounded-full border border-black/[0.08] bg-card p-0.5 dark:border-white/[0.1] sm:self-auto">
          {DEVICES.map((item) => {
            const available = Boolean(shots[item.key]);
            const active = effectiveDevice === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setDevice(item.key)}
                disabled={!available}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-[11px] transition-colors duration-200 ${
                  active
                    ? 'bg-accent text-white'
                    : 'text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.08] pb-3 dark:border-white/[0.08]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Page</span>
          <span className="truncate text-[13px] font-medium text-ink">{page.label}</span>
          {page.note && <span className="truncate text-[11px] text-ink-faint">· {page.note}</span>}
          <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
            {index + 1} / {pages.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {prevPage ? (
            <Link
              to={pageTo(prevPage)}
              aria-label="上一页"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] text-ink-muted transition-colors hover:border-black/[0.16] hover:text-ink dark:border-white/[0.1] dark:hover:border-white/[0.2]"
            >
              <IconChevron className="h-3.5 w-3.5 rotate-180" />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] text-ink-faint/40 dark:border-white/[0.06]">
              <IconChevron className="h-3.5 w-3.5 rotate-180" />
            </span>
          )}
          {nextPage ? (
            <Link
              to={pageTo(nextPage)}
              aria-label="下一页"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] text-ink-muted transition-colors hover:border-black/[0.16] hover:text-ink dark:border-white/[0.1] dark:hover:border-white/[0.2]"
            >
              <IconChevron className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] text-ink-faint/40 dark:border-white/[0.06]">
              <IconChevron className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {effectiveDevice === 'desktop' ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] bg-card shadow-apple-lg dark:border-white/[0.08]">
          <div className="flex h-10 items-center gap-1.5 border-b border-black/[0.06] px-4 dark:border-white/[0.08]">
            <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
            <span className="ml-3 min-w-0 flex-1 truncate font-mono text-[11px] text-ink-faint">
              new-king.com{page.path}
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.12em] text-ink-faint sm:block">
              Desktop
            </span>
          </div>
          {src ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              title="放大查看"
              aria-label={`放大查看：${version.title} · ${page.label} · 桌面端`}
              className="block w-full cursor-zoom-in bg-page"
            >
              <img
                src={src}
                alt={`${version.title} · ${page.label} · 桌面端截图`}
                className="block w-full"
              />
            </button>
          ) : (
            <div className="flex h-[320px] items-center justify-center bg-page px-6 text-center text-sm text-ink-faint">
              该版本没有桌面截图
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto mt-5 w-full max-w-2xl overflow-hidden rounded-2xl border border-black/[0.08] bg-card shadow-apple-lg dark:border-white/[0.08]">
          <div className="flex h-10 items-center gap-1.5 border-b border-black/[0.06] px-4 dark:border-white/[0.08]">
            <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
            <span className="ml-3 min-w-0 flex-1 truncate font-mono text-[11px] text-ink-faint">
              new-king.com{page.path}
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.12em] text-ink-faint sm:block">
              Mobile
            </span>
          </div>
          <div className="flex justify-center bg-page px-5 py-8">
            {src ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                title="放大查看"
                aria-label={`放大查看：${version.title} · ${page.label} · 手机端`}
                className="block w-[300px] max-w-full cursor-zoom-in"
              >
                <img
                  src={src}
                  alt={`${version.title} · ${page.label} · 手机端截图`}
                  className="w-full rounded-[26px] border border-black/10 shadow-apple-lg dark:border-white/10"
                />
              </button>
            ) : (
              <div className="flex h-[420px] w-[300px] items-center justify-center text-center text-sm text-ink-faint">
                该版本没有手机截图
              </div>
            )}
          </div>
        </div>
      )}

      {!hasDesktop && !hasMobile ? (
        <p className="mt-2 text-[11px] text-ink-faint">该版本没有截图。</p>
      ) : !hasDesktop || !hasMobile ? (
        <p className="mt-2 text-[11px] text-ink-faint">
          该版本只提供了{hasDesktop ? '桌面' : '手机'}截图。
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-faint">
        <span>
          {version.title} · {page.label} · {page.path} ·{' '}
          {effectiveDevice === 'desktop' ? '桌面' : '手机'}
        </span>
        <div className="flex items-center gap-4">
          {commitUrl && (
            <a
              href={commitUrl}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              查看该版本 commit ↗
            </a>
          )}
          <Link to="/" className="transition-colors hover:text-ink">
            返回当前站点
          </Link>
        </div>
      </div>

      <p className="mt-10 border-t border-black/[0.08] pt-5 text-[11px] leading-5 text-ink-faint dark:border-white/[0.08]">
        历史版本是静态截图，点击可放大查看；交互与动效以当前站点为准。
      </p>

      {lightboxOpen && (
        <HistoryLightbox
          version={version}
          page={page}
          pages={pages}
          device={effectiveDevice}
          setDevice={setDevice}
          shots={shots}
          src={src}
          onClose={() => setLightboxOpen(false)}
          onPrev={prevPage ? () => navigate(pageTo(prevPage)) : null}
          onNext={nextPage ? () => navigate(pageTo(nextPage)) : null}
        />
      )}
    </div>
  );
}
