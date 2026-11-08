import { useEffect, useRef } from 'react';
import { IconChevron, IconX } from '../icons';

const DEVICES = [
  { key: 'desktop', label: '桌面' },
  { key: 'mobile', label: '手机' },
];

/**
 * 版本截图大图预览：
 * - 背景 / X / Esc 关闭
 * - 上一页/下一页按钮或 ← → 键切换页面（通过父级路由切换，大图层保持打开）
 * - 桌面 / 手机切换
 * - 默认 fit 尺寸，不按原图尺寸撑满屏幕
 */
export default function HistoryLightbox({
  version,
  page,
  pages,
  device,
  setDevice,
  shots,
  src,
  onClose,
  onPrev,
  onNext,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, onPrev, onNext]);

  const index = pages.indexOf(page);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="查看版本截图"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-[1200px] flex-col"
      >
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] text-white/50">
              {version.label} · {version.title}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-medium text-white">
              {page.label}
              {page.note && <span className="ml-1.5 text-white/50">· {page.note}</span>}
              <span className="ml-2 text-[11px] font-normal text-white/50">
                {index + 1} / {pages.length}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center rounded-full border border-white/15 bg-white/5 p-0.5">
              {DEVICES.map((item) => {
                const available = Boolean(shots[item.key]);
                const active = device === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDevice(item.key)}
                    disabled={!available}
                    aria-pressed={active}
                    className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
                      active ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                    } disabled:cursor-not-allowed disabled:opacity-30`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex w-fit max-w-full items-center justify-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onPrev || undefined}
              disabled={!onPrev}
              aria-label="上一页"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <IconChevron className="h-4 w-4 rotate-180" />
            </button>

            {src ? (
              <img
                src={src}
                alt={`${version.title} · ${page.label} · ${device === 'desktop' ? '桌面' : '手机'}截图`}
                className="h-auto max-h-[82vh] w-auto max-w-[calc(100vw-120px)] rounded-xl bg-page object-contain shadow-2xl sm:max-w-[min(1050px,calc(100vw-176px))]"
              />
            ) : (
              <div className="flex h-[320px] w-[min(900px,calc(100vw-240px))] items-center justify-center rounded-xl bg-white/5 text-sm text-white/50">
                该页面没有当前设备的截图
              </div>
            )}

            <button
              type="button"
              onClick={onNext || undefined}
              disabled={!onNext}
              aria-label="下一页"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <IconChevron className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] leading-4 text-white/40">
          <div className="hidden sm:block">← → 切换页面 · Esc 关闭</div>
          <div className="sm:hidden">点空白关闭</div>
          <div className="mt-0.5 text-white/30">
            {version.date} · {device === 'desktop' ? '桌面' : '手机'}
          </div>
        </div>
      </div>
    </div>
  );
}
