import { useRef, useState } from 'react';
import PageShell from '../components/PageShell';
import DemoPreview from '../components/projects/DemoPreview';
import { projects } from '../data/mockData';

// 封面几何图形（中性色，随主题色）—— 每个项目一种
const COVER_SHAPES = {
  ring: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <circle cx="26" cy="26" r="21" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="13" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  square: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <rect x="8" y="8" width="36" height="36" strokeWidth="1.5" />
      <rect x="17" y="17" width="18" height="18" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  triangle: (
    <svg width="42" height="38" viewBox="0 0 56 50" fill="none" stroke="currentColor">
      <path d="M28 6 52 44H4Z" strokeWidth="1.5" />
      <path d="M28 20 41 40H15Z" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  dots: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="currentColor">
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={10 + r * 12} cy={10 + c * 12} r="1.7" />
        ))
      )}
    </svg>
  ),
  cross: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <path d="M4 26h44" strokeWidth="1.5" />
      <path d="M26 4v44" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="8" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
};

// 短日期：2026-06-15 → 06/15
const formatDate = (iso) => {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
};

// 封面缩略图（含细网格线，深浅模式自适应）
function CoverThumb({ shape, active, small }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-black/[0.04] via-black/[0.01] to-black/[0.08] dark:from-white/[0.05] dark:via-transparent dark:to-white/[0.1] ${
        small ? 'h-12 w-12' : 'h-24 w-24'
      }`}
    >
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div
        className={`absolute inset-0 flex items-center justify-center text-ink-faint transition-opacity duration-200 ${
          active ? 'opacity-100' : 'opacity-60'
        }`}
      >
        {COVER_SHAPES[shape]}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [index, setIndex] = useState(0);
  const touchX = useRef(null);
  const total = projects.length;
  const p = projects[index];

  const next = () => setIndex((i) => (i + 1) % total);
  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const prevItem = projects[(index - 1 + total) % total];
  const nextItem = projects[(index + 1) % total];

  return (
    <PageShell eyebrow="Projects">
      {/* 相册式展示：当前项目 + 自动播放预览；左右箭头 / 滑动 / 缩略图切换 */}
      <div
        className="relative"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx > 50) prev();
          else if (dx < -50) next();
          touchX.current = null;
        }}
      >
        {/* 页码指示 */}
        <div className="mb-4 flex justify-end text-xs tabular-nums text-ink-faint">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>

        {/* 主展示卡片（key 强制重挂载 → 预览从头播放） */}
        <div
          key={p.id}
          className="animate-[fade-in-up_0.4s_ease_both] relative rounded-lg border border-black/[0.06] bg-card dark:border-white/10"
        >
          <div className="flex items-center gap-5 p-5">
            <CoverThumb shape={p.cover} active />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-[17px] font-medium leading-snug text-ink">
                  {p.title}
                </p>
                <p className="shrink-0 text-xs tabular-nums text-ink-faint">
                  {formatDate(p.date)}
                </p>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
                {p.description}
              </p>
            </div>
          </div>
          {/* 预览动画：常驻自动播放 */}
          <DemoPreview p={p} active />
          {/* 左右箭头：与整张卡片等高（卡片 relative 内定位）、无背景、hover 阴影变化提示可点击 */}
          <button
            onClick={prev}
            aria-label="上一个项目"
            className="group absolute -left-[17.5rem] top-0 bottom-0 z-10 hidden w-[18.5rem] items-center justify-end pr-10 text-ink-faint transition-colors duration-200 hover:text-ink sm:flex"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="transition-transform duration-200 group-hover:-translate-x-1"
            >
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="下一个项目"
            className="group absolute -right-[17.5rem] top-0 bottom-0 z-10 hidden w-[18.5rem] items-center justify-start pl-10 text-ink-faint transition-colors duration-200 hover:text-ink sm:flex"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="transition-transform duration-200 group-hover:translate-x-1"
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>

      {/* 底部缩略图导航：所有项目，当前高亮，点击直达（移动端主切换方式） */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {projects.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setIndex(i)}
            aria-label={item.title}
            className={`group relative rounded-lg p-0.5 transition-all duration-200 ${
              i === index
                ? 'bg-ink/15 dark:bg-white/20'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <CoverThumb shape={item.cover} active={i === index} small />
            {/* 悬停显示项目名称 */}
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/[0.08] bg-card px-2 py-1 text-[11px] text-ink-soft opacity-0 shadow-apple transition-opacity duration-150 group-hover:opacity-100 dark:border-white/15">
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
