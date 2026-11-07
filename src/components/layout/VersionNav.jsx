import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVersions } from '../../hooks/useVersions';
import { useHistoryScroll } from '../history/HistoryScrollContext';

const pageSectionId = (versionId, pageId) => `${versionId}--${pageId}`;

/**
 * 历史模式侧栏：所有版本 + 所有页面。
 * 主区长页按「整屏容器」滚动，active 跟随；点击平滑滚到对应容器。
 */
export default function VersionNav({ onClose, scrollRef }) {
  const { versions, loading, error } = useVersions();
  const { activeId, setActiveId, scrollToSection } = useHistoryScroll();
  const itemRefs = useRef(new Map());
  const rootRef = useRef(null);
  const [indicator, setIndicator] = useState({ top: 0, left: 0, width: 0, height: 0, opacity: 0 });
  // 首次定位（进入页面 / 刷新）直接落位，不播放「从顶部滑下来」的动画
  const [animateIndicator, setAnimateIndicator] = useState(false);
  const [placed, setPlaced] = useState(false);

  const activeVersionId = activeId?.split('--')[0] || versions[0]?.id;
  // activeId 尚未下发时，先按第一页测量，保证首帧就停在该项上
  const measureId =
    activeId ||
    (versions[0]?.pages[0]
      ? pageSectionId(versions[0].id, versions[0].pages[0].id)
      : null);

  const measureIndicator = () => {
    const root = rootRef.current;
    const el = measureId ? itemRefs.current.get(measureId) : null;
    if (!root || !el) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    setPlaced(true);
    setIndicator({
      top: itemRect.top - rootRect.top,
      left: itemRect.left - rootRect.left,
      width: itemRect.width,
      height: itemRect.height,
      opacity: 1,
    });
  };

  useLayoutEffect(measureIndicator, [measureId]);

  // 首帧落位完成后再开启过渡，之后切换选中项才播放滑动动画
  useEffect(() => {
    if (!placed || animateIndicator) return undefined;
    const timer = window.setTimeout(() => setAnimateIndicator(true), 0);
    return () => window.clearTimeout(timer);
  }, [placed, animateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', measureIndicator);
    return () => window.removeEventListener('resize', measureIndicator);
  }, [measureId]);

  useEffect(() => {
    const nav = scrollRef?.current;
    const el = activeId ? itemRefs.current.get(activeId) : null;
    if (!nav || !el) return;
    const navRect = nav.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    const pad = 12;
    if (itemRect.top >= navRect.top + pad && itemRect.bottom <= navRect.bottom - pad) return;
    const top =
      nav.scrollTop + itemRect.top - navRect.top - nav.clientHeight / 2 + itemRect.height / 2;
    nav.scrollTo({ top, behavior: 'smooth' });
  }, [activeId, scrollRef]);

  const setItemRef = (id) => (el) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  const select = (id) => {
    setActiveId(id);
    onClose?.();
    window.setTimeout(() => scrollToSection(id), 0);
  };

  if (loading) {
    return (
      <div className="space-y-3 px-2 pt-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-2.5 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/10"
            style={{ width: `${70 - i * 8}%` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="px-2 pt-1 text-[11px] leading-5 text-ink-faint">历史版本加载失败</p>;
  }

  if (versions.length === 0) {
    return <p className="px-2 pt-1 text-[11px] text-ink-faint">还没有历史版本</p>;
  }

  return (
    <div ref={rootRef} className="relative space-y-1">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute z-0 rounded-lg bg-black/[0.06] dark:bg-white/10 ${
          animateIndicator
            ? 'transition-[top,left,width,height,opacity] duration-300 ease-smooth'
            : ''
        }`}
        style={indicator}
      />
      {versions.map((version, index) => {
        const current = index === 0;
        const activeVersion = version.id === activeVersionId;
        const firstPage = version.pages[0];
        const versionTarget = firstPage ? pageSectionId(version.id, firstPage.id) : null;
        return (
          <div key={version.id}>
            <button
              type="button"
              ref={versionTarget ? setItemRef(versionTarget) : undefined}
              onClick={() => versionTarget && select(versionTarget)}
              aria-current={activeVersion ? 'page' : undefined}
              className={`relative z-10 w-full rounded-lg px-2 py-2 text-left transition-colors duration-200 ${
                activeVersion
                  ? 'text-ink'
                  : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] tabular-nums tracking-[0.08em] text-ink-faint">
                  {version.label || version.date}
                </span>
                {current && (
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] text-ink-muted dark:bg-white/10">
                    当前
                  </span>
                )}
              </div>
              <p
                className={`mt-0.5 truncate text-[12.5px] ${
                  activeVersion ? 'font-medium text-ink' : 'text-ink-soft'
                }`}
                title={version.title}
              >
                {version.title}
              </p>
            </button>

            <ul className="ml-[9px] mt-1 space-y-px border-l border-black/[0.06] pl-2 dark:border-white/[0.08]">
              {version.pages.map((page) => {
                const id = pageSectionId(version.id, page.id);
                const pageActive = activeId === id;
                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      ref={setItemRef(id)}
                      onClick={() => select(id)}
                      aria-current={pageActive ? 'page' : undefined}
                      className={`relative z-10 block w-full rounded-md px-2 py-1 text-left text-[12px] transition-colors duration-200 ${
                        pageActive
                          ? 'text-ink'
                          : 'text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="block truncate">{page.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
