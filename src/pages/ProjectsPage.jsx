import { useEffect, useRef, useState } from 'react';
import PageShell from '../components/PageShell';
import DemoPreview from '../components/projects/DemoPreview';
import BoxCoverIcon from '../components/projects/BoxCoverIcon';
import { formatDate } from '../data/mockData';
import { useContent } from '../hooks/useContent';

// 项目预览动画是前端专属效果（示意动画），后端只给数据。
// 这里按项目 id 映射内置的 preview 场景；后端数据无该字段，动画逻辑不受影响。
const PREVIEW_BY_ID = {
  j6: { scene: 'canvas' },
  j1: { scene: 'terminal', lines: ['正在连接集群…', '正在拉取指标…', '正在执行指令…', '任务完成 ✓'] },
  j2: { scene: 'form', input: 'portfolio.json', result: '已生成 12 个页面 ✓' },
  j7: {
    scene: 'transfer',
    code: ['A', '3', '7', '2', 'K'],
    file: 'design-spec.pdf',
    size: '2.4 MB',
  },
};

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

// 封面缩略图（含细网格线，深浅模式自适应）
function CoverThumb({ shape, active, small, href }) {
  const iconSize = small ? 26 : 44;

  const thumb = (
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
        {shape === 'box' ? (
          <BoxCoverIcon size={iconSize} strokeWidth={1.5} />
        ) : (
          COVER_SHAPES[shape]
        )}
      </div>
    </div>
  );

  if (href && shape === 'box') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block shrink-0 rounded-md transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        aria-label="访问项目官网"
      >
        {thumb}
      </a>
    );
  }

  return thumb;
}

// 左右箭头点击区：独立组件（局部距离状态，避免 mousemove 重渲染整个页面）
function ProjectMeta({ title, date, description, url }) {
  return (
    <div className="flex min-h-24 min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[17px] font-medium leading-snug text-ink">{title}</p>
        <p className="shrink-0 text-xs tabular-nums text-ink-muted">{formatDate(date)}</p>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">{description}</p>
      <div className="mt-auto h-5 pt-0.5">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-w-0 items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
              aria-hidden
            >
              <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="truncate underline decoration-black/10 underline-offset-2 transition-colors group-hover:decoration-black/25 dark:decoration-white/15 dark:group-hover:decoration-white/30">
              {url}
            </span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ArrowZone({ direction, onClick, label }) {
  const [dist, setDist] = useState(0);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const d = direction === 'left' ? rect.right - e.clientX : e.clientX - rect.left;
        setDist(Math.max(0, Math.min(1, d / rect.width)));
      }}
      onMouseLeave={() => setDist(0)}
      className={`group absolute top-0 bottom-0 z-10 hidden items-center text-ink-faint transition-colors duration-200 hover:text-ink sm:flex ${
        direction === 'left'
          ? 'left-[calc(-50vw+336px)] w-[calc(50vw-320px)] justify-end pr-10'
          : 'right-[calc(-50vw+336px)] w-[calc(50vw-320px)] justify-start pl-10'
      }`}
    >
      <svg
        width={32 + Math.round(dist * 20)}
        height={32 + Math.round(dist * 20)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={`transition-transform duration-200 ${
          direction === 'left' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'
        }`}
      >
        <path
          d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function ProjectsPage() {
  const { data, loading } = useContent();
  const projects = data?.projects ?? [];
  const [index, setIndex] = useState(0);

  // 数据到达后索引一定有效；数据变化时把当前索引兜底到有效范围
  useEffect(() => {
    if (projects.length > 0 && index >= projects.length) setIndex(0);
  }, [projects.length, index]);

  const touchX = useRef(null);
  const total = projects.length;
  const p = projects[index];

  const next = () => setIndex((i) => (i + 1) % total);
  const prev = () => setIndex((i) => (i - 1 + total) % total);

  if (loading) {
    return (
      <PageShell eyebrow="Projects">
        <p className="py-8 text-sm text-ink-faint">加载中…</p>
      </PageShell>
    );
  }

  // 把后端数据补上前端动画配置 preview。
  // 后端 id 是文件名（如 j6-canvas），这里取短前缀（j6）匹配动画配置；
  // 匹配不到给默认 list 动画（不崩溃）。
  const shortId = (p.id || '').split('-')[0];
  const item = { ...p, preview: PREVIEW_BY_ID[shortId] || { scene: 'list' } };

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
          key={item.id}
          className="animate-[fade-in-up_0.4s_ease_both] relative surface-elevated rounded-lg border border-black/[0.06] dark:border-white/[0.06]"
        >
          <div className="flex items-center gap-5 p-5">
            <CoverThumb shape={item.cover} active href={item.url} />
            <ProjectMeta
              title={item.title}
              date={item.date}
              description={item.description}
              url={item.url}
            />
          </div>
          {/* 预览动画：常驻自动播放 */}
          <DemoPreview p={item} active />
          {/* 左右箭头：铺满视口边缘到卡片，离卡片越远箭头越大（独立组件局部状态） */}
          <ArrowZone direction="left" onClick={prev} label="上一个项目" />
          <ArrowZone direction="right" onClick={next} label="下一个项目" />
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
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/[0.08] surface-elevated px-2 py-1 text-[11px] text-ink-soft opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:border-white/[0.08]">
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
