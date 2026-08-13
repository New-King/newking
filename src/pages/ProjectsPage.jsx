import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { projects } from '../data/mockData';

// 短日期：2026-06-15 → 06/15
const formatDate = (iso) => {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
};

// 封面几何图形（中性色，随主题色）—— 每个项目一种
const COVER_SHAPES = {
  ring: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <circle cx="26" cy="26" r="21" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="13" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  square: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <rect x="8" y="8" width="36" height="36" strokeWidth="1.5" />
      <rect x="17" y="17" width="18" height="18" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  triangle: (
    <svg width="56" height="50" viewBox="0 0 56 50" fill="none" stroke="currentColor">
      <path d="M28 6 52 44H4Z" strokeWidth="1.5" />
      <path d="M28 20 41 40H15Z" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  dots: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="currentColor">
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={10 + r * 12} cy={10 + c * 12} r="1.7" />
        ))
      )}
    </svg>
  ),
  cross: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <path d="M4 26h44" strokeWidth="1.5" />
      <path d="M26 4v44" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="8" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
};

export default function ProjectsPage() {
  return (
    <PageShell
      eyebrow="Projects"
      note="内容筹备中 · 悬停顶部导航可预览最新项目"
    >
      {/* 单列项目列表：左侧封面缩略图 + 右侧标题行/描述 */}
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={p.to}
            className="group flex items-center gap-5 rounded-lg border border-black/[0.06] bg-card p-4 transition-colors duration-200 hover:border-black/[0.12] dark:border-white/10 dark:hover:border-white/20"
          >
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-black/[0.04] via-black/[0.01] to-black/[0.08] dark:from-white/[0.05] dark:via-transparent dark:to-white/[0.1]">
              {/* 细网格线（复用首页网格 token，深浅模式自适应） */}
              <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] [background-size:16px_16px]" />
              {/* 几何图形：hover 时提亮 */}
              <div className="absolute inset-0 flex items-center justify-center text-ink-faint opacity-60 transition-opacity duration-200 group-hover:opacity-100">
                {COVER_SHAPES[p.cover]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-[16px] font-medium leading-snug text-ink">
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
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
