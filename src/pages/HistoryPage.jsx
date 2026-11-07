import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useVersions } from '../hooks/useVersions';
import { useHistoryScroll } from '../components/history/HistoryScrollContext';
import HistoryLightbox from '../components/layout/HistoryLightbox';

const DEVICES = [
  { key: 'desktop', label: '桌面' },
  { key: 'mobile', label: '手机' },
];

const defaultDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
    ? 'mobile'
    : 'desktop';

const sectionId = (versionId, pageId) => `${versionId}--${pageId}`;

function HistoryState({ children }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-10 pt-8 sm:px-8 lg:px-12 lg:pt-12">
      <p className="text-sm leading-6 text-ink-faint">{children}</p>
    </div>
  );
}

function PageSlide({
  version,
  page,
  pages,
  pageIndex,
  isCurrent,
  device,
  setDevice,
  onOpen,
}) {
  const shots = page.screenshots || {};
  const hasDesktop = Boolean(shots.desktop);
  const hasMobile = Boolean(shots.mobile);
  const effectiveDevice = shots[device] ? device : hasDesktop ? 'desktop' : 'mobile';
  const src = shots[effectiveDevice];
  const commitUrl = version.commit
    ? `https://github.com/New-King/newking/commit/${version.commit}`
    : null;

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-6 pb-0 pt-8 sm:px-8 lg:px-12 lg:pb-8 lg:pt-12">
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
            {pageIndex + 1} / {pages.length}
          </span>
        </div>
      </div>

      <div className="mx-auto mt-5 w-full max-w-[760px] overflow-hidden rounded-2xl border border-black/[0.08] bg-card shadow-apple-lg dark:border-white/[0.08]">
        <div className="flex h-10 items-center gap-1.5 border-b border-black/[0.06] px-4 dark:border-white/[0.08]">
          <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
          <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
          <span className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/15" />
          <span className="ml-3 min-w-0 flex-1 truncate font-mono text-[11px] text-ink-faint">
            new-king.com{page.path}
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.12em] text-ink-faint sm:block">
            {effectiveDevice === 'desktop' ? 'Desktop' : 'Mobile'}
          </span>
        </div>

        {effectiveDevice === 'desktop' ? (
          src ? (
            <button
              type="button"
              onClick={onOpen}
              title="放大查看"
              aria-label={`放大查看：${version.title} · ${page.label} · 桌面端`}
              className="block w-full cursor-zoom-in bg-page"
            >
              <img
                src={src}
                alt={`${version.title} · ${page.label} · 桌面端截图`}
                className="mx-auto block h-auto max-h-[calc(100dvh-420px)] w-auto max-w-full"
              />
            </button>
          ) : (
            <div className="flex h-[320px] items-center justify-center bg-page px-6 text-center text-sm text-ink-faint">
              该版本没有桌面截图
            </div>
          )
        ) : (
          <div className="flex justify-center bg-page px-5 py-6">
            {src ? (
              <button
                type="button"
                onClick={onOpen}
                title="放大查看"
                aria-label={`放大查看：${version.title} · ${page.label} · 手机端`}
                className="block w-auto max-w-full cursor-zoom-in"
              >
                <img
                  src={src}
                  alt={`${version.title} · ${page.label} · 手机端截图`}
                  className="mx-auto h-auto max-h-[calc(100dvh-526px)] w-auto max-w-[300px] rounded-[26px] border border-black/10 shadow-apple-lg dark:border-white/10"
                />
              </button>
            ) : (
              <div className="flex h-[420px] w-[300px] items-center justify-center text-center text-sm text-ink-faint">
                该版本没有手机截图
              </div>
            )}
          </div>
        )}
      </div>

      {!hasDesktop && !hasMobile ? (
        <p className="mt-2 text-[11px] text-ink-faint">该版本没有截图。</p>
      ) : !hasDesktop || !hasMobile ? (
        <p className="mt-2 text-[11px] text-ink-faint">
          该版本只提供了{hasDesktop ? '桌面' : '手机'}截图。
        </p>
      ) : null}
    </div>
  );
}

export default function HistoryPage() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/history(?:\/([^/]+))?(?:\/([^/]+))?/);
  const versionId = match?.[1];
  const pageId = match?.[2];
  const { versions, loading, error } = useVersions();
  const { setActiveId } = useHistoryScroll();
  const scrollRef = useRef(null);
  const targetIndexRef = useRef(0);
  const activeTimer = useRef(null);
  const [device, setDevice] = useState(defaultDevice);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const sections = useMemo(
    () =>
      versions.flatMap((version) =>
        (version.pages ?? []).map((page, pageIndex) => ({
          id: sectionId(version.id, page.id),
          version,
          page,
          pageIndex,
        }))
      ),
    [versions]
  );

  useEffect(
    () => () => {
      if (activeTimer.current) window.clearTimeout(activeTimer.current);
    },
    []
  );

  useEffect(() => {
    const previous = document.title;
    document.title = '历史版本 · New-King';
    return () => {
      document.title = previous;
    };
  }, []);

  // 初始定位：/history/xxx/yyy 直接滚到对应容器（布局阶段完成，首帧即到位）
  useLayoutEffect(() => {
    if (!sections.length) return;
    const index = sections.findIndex(
      (item) =>
        item.version.id === versionId && (!pageId || item.page.id === pageId)
    );
    const target = index >= 0 ? index : 0;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = target * el.clientHeight;
    targetIndexRef.current = target;
    setActiveId(sections[target].id);
  }, [sections, versionId, pageId, setActiveId]);

  // 鼠标滚轮：每格滚一屏。
  // 用 rAF 补间代替连续 scrollTo({ behavior: 'smooth' })：连续滚动事件只更新目标，
  // 动画从当前位置继续，避免每次滚轮都打断系统平滑滚动造成起步卡顿。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || sections.length === 0) return undefined;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 每 16.7ms 消化剩余距离的 18%；高刷屏按实际帧间隔换算，速度一致
    const LERP = 0.18;

    let raf = null;
    let lastTime = 0;
    let snapOff = false;

    const toggleSnap = (off) => {
      if (off === snapOff) return;
      // 补间期间关闭强制吸附，避免浏览器对每一帧都重新吸附造成抖动
      el.style.scrollSnapType = off ? 'none' : '';
      snapOff = off;
    };

    const stopAnimation = () => {
      if (raf !== null) window.cancelAnimationFrame(raf);
      raf = null;
      lastTime = 0;
      toggleSnap(false);
    };

    const tick = (now) => {
      const dest = targetIndexRef.current * el.clientHeight;
      const diff = dest - el.scrollTop;
      if (Math.abs(diff) < 0.5) {
        el.scrollTop = dest;
        raf = null;
        lastTime = 0;
        toggleSnap(false);
        return;
      }
      const dt = lastTime ? Math.min(now - lastTime, 64) : 16.7;
      lastTime = now;
      el.scrollTop += diff * (1 - Math.pow(1 - LERP, dt / 16.7));
      raf = window.requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (raf !== null) return;
      lastTime = 0;
      toggleSnap(true);
      raf = window.requestAnimationFrame(tick);
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      // 小增量（触控板）交给原生滚动 + scroll-snap，允许连续滑
      if (Math.abs(delta) < 40) {
        stopAnimation();
        return;
      }

      // 鼠标滚轮格：每格滚一屏，连续滚动只更新目标，不重启动画
      e.preventDefault();
      const base = targetIndexRef.current;
      const target = Math.min(
        sections.length - 1,
        Math.max(0, base + (delta > 0 ? 1 : -1))
      );
      if (target === base) return;
      targetIndexRef.current = target;

      if (reduceMotion) {
        toggleSnap(false);
        el.scrollTop = target * el.clientHeight;
        return;
      }
      startAnimation();
    };

    const onScrollEnd = () => {
      // 补间进行中不按中间位置覆盖目标页
      if (raf !== null) return;
      const index = Math.min(
        sections.length - 1,
        Math.max(0, Math.round(el.scrollTop / el.clientHeight))
      );
      const section = sections[index];
      if (section) setActiveId(section.id);
      targetIndexRef.current = index;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scrollend', onScrollEnd);
    el.addEventListener('pointerdown', stopAnimation);
    el.addEventListener('touchstart', stopAnimation, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scrollend', onScrollEnd);
      el.removeEventListener('pointerdown', stopAnimation);
      el.removeEventListener('touchstart', stopAnimation);
      if (raf !== null) window.cancelAnimationFrame(raf);
      el.style.scrollSnapType = '';
    };
  }, [sections, setActiveId]);

  const onScroll = () => {
    // Chrome / 新版 Safari 用 scrollend；没有 scrollend 的浏览器用长 debounce 兜底
    if (typeof window !== 'undefined' && 'onscrollend' in window) return;
    const el = scrollRef.current;
    if (!el || sections.length === 0) return;
    if (activeTimer.current) window.clearTimeout(activeTimer.current);
    activeTimer.current = window.setTimeout(() => {
      const index = Math.min(
        sections.length - 1,
        Math.max(0, Math.round(el.scrollTop / el.clientHeight))
      );
      const section = sections[index];
      if (section) setActiveId(section.id);
      targetIndexRef.current = index;
    }, 450);
  };

  if (loading) return <HistoryState>加载历史版本…</HistoryState>;
  if (error) return <HistoryState>历史版本加载失败，请确认版本清单是否存在。</HistoryState>;
  if (versions.length === 0) return <HistoryState>还没有历史版本。</HistoryState>;
  if (versionId && !versions.some((version) => version.id === versionId)) {
    return <HistoryState>未找到该版本。</HistoryState>;
  }
  if (sections.length === 0) return <HistoryState>还没有页面截图。</HistoryState>;

  const latest = versions[0];
  const latestCommitUrl = latest.commit
    ? `https://github.com/New-King/newking/commit/${latest.commit}`
    : null;

  const selected = lightboxIndex !== null ? sections[lightboxIndex] : null;
  const selectedShots = selected?.page.screenshots || {};
  const selectedDevice = selectedShots[device]
    ? device
    : selectedShots.desktop
      ? 'desktop'
      : 'mobile';
  const selectedSrc = selected ? selectedShots[selectedDevice] : undefined;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {sections.map(({ id, version, page, pageIndex }, index) => (
          <section
            key={id}
            id={id}
            className="h-full snap-start"
          >
            <PageSlide
              version={version}
              page={page}
              pages={version.pages}
              pageIndex={pageIndex}
              isCurrent={version.id === latest.id}
              device={device}
              setDevice={setDevice}
              onOpen={() => setLightboxIndex(index)}
            />
          </section>
        ))}
      </div>

      <div className="shrink-0 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3 border-t border-black/[0.08] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-[11px] leading-5 text-ink-faint dark:border-white/[0.08] lg:h-12 lg:flex-nowrap lg:py-0">
          <p className="min-w-0">新故相推，日生不滞。</p>
          <div className="flex shrink-0 items-center gap-4">
            {latestCommitUrl && (
              <a
                href={latestCommitUrl}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ink"
              >
                查看最新版本 commit ↗
              </a>
            )}
            <Link to="/" className="transition-colors hover:text-ink">
              返回当前站点
            </Link>
          </div>
        </div>
      </div>

      {selected && (
        <HistoryLightbox
          version={selected.version}
          page={selected.page}
          pages={selected.version.pages}
          device={selectedDevice}
          setDevice={setDevice}
          shots={selectedShots}
          src={selectedSrc}
          onClose={() => setLightboxIndex(null)}
          onPrev={
            lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : null
          }
          onNext={
            lightboxIndex < sections.length - 1
              ? () => setLightboxIndex(lightboxIndex + 1)
              : null
          }
        />
      )}
    </div>
  );
}
