import { useEffect, useRef, useState } from 'react';
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

// 演示预览：优先播放媒体（GIF / 自动播放视频），无媒体时回退到动画模拟
// media 结构：{ type: 'gif' | 'video', src: '/media/demo.gif' }，视频需 muted 才能自动播放
function DemoPlayer({ p, active }) {
  const { media } = p;
  if (media) {
    return (
      <div className="mx-4 mb-4 overflow-hidden rounded-md border border-black/[0.06] bg-page dark:border-white/10">
        {media.type === 'video' ? (
          <video
            className="aspect-[16/9] w-full object-cover"
            src={active ? media.src : undefined}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            className="aspect-[16/9] w-full object-cover"
            src={active ? media.src : undefined}
            alt={p.title}
          />
        )}
      </div>
    );
  }
  return <DemoAnimation title={p.title} />;
}

// 动画模拟：16:9 终端窗口内逐行执行「连接 → 检索 → 生成 → 完成」，循环播放
const DEMO_LINES = ['正在连接服务…', '正在检索知识库…', '正在生成回复…', '任务完成 ✓'];

function DemoAnimation({ title }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setStep((s) => (s + 1) % (DEMO_LINES.length + 1)),
      800
    );
    return () => clearInterval(t);
  }, []);
  const visible = DEMO_LINES.slice(0, step + 1);
  const progress = (step / DEMO_LINES.length) * 100;
  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-md border border-black/[0.06] bg-page dark:border-white/10">
      {/* 迷你窗口标题栏 */}
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] px-3 py-2 dark:border-white/10">
        <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/25" />
        <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/25" />
        <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/25" />
        <span className="ml-2 truncate text-[11px] text-ink-faint">{title}</span>
      </div>
      {/* 16:9 内容区：终端输出逐行推进 */}
      <div className="flex aspect-[16/9] flex-col justify-between p-5">
        <div className="space-y-2 font-mono text-xs leading-relaxed text-ink-soft">
          {visible.map((line, i) => (
            <p
              key={i}
              className={line.includes('✓') ? 'text-ink' : undefined}
            >
              {i === visible.length - 1 && !line.includes('✓') && (
                <span className="mr-1 text-ink-faint">$</span>
              )}
              {line}
            </p>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-ink-faint">
            <span>{step >= DEMO_LINES.length ? '完成' : '执行中'}</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
            <div
              className="h-full rounded-full bg-ink/40 transition-all duration-300 dark:bg-white/30"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 单个项目卡片：悬停蓄力 1s 后展开演示预览
function ProjectCard({ p }) {
  const [hovered, setHovered] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleEnter = () => {
    // 触屏设备（无 hover）不启用该交互
    if (!window.matchMedia('(hover: hover)').matches) return;
    setHovered(true);
    timer.current = setTimeout(() => setPreviewing(true), 1000);
  };
  const handleLeave = () => {
    clearTimeout(timer.current);
    setHovered(false);
    setPreviewing(false);
  };

  return (
    <Link
      to={p.to}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="group relative overflow-hidden rounded-lg border border-black/[0.06] bg-card transition-colors duration-200 hover:border-black/[0.12] dark:border-white/10 dark:hover:border-white/20"
    >
      <div className="flex items-center gap-5 p-4">
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
      </div>

      {/* 演示预览区：蓄力完成后平滑展开 */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          previewing ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <DemoPlayer p={p} active={previewing} />
        </div>
      </div>

      {/* 蓄力进度条：悬停 1s 走满后淡出 */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left bg-ink/15 dark:bg-white/25"
        style={{
          transform: `scaleX(${hovered ? 1 : 0})`,
          opacity: previewing ? 0 : 1,
          transition: hovered
            ? 'transform 1000ms linear, opacity 300ms ease'
            : 'transform 150ms ease-out, opacity 300ms ease',
        }}
      />
    </Link>
  );
}

export default function ProjectsPage() {
  return (
    <PageShell
      eyebrow="Projects"
      note="内容筹备中 · 悬停顶部导航可预览最新项目"
    >
      {/* 单列项目列表：左侧封面缩略图 + 右侧标题行/描述；悬停 1s 展开演示预览 */}
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </PageShell>
  );
}
