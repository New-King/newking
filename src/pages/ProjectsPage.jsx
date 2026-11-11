import { useEffect, useRef, useState } from 'react';
import PageShell from '../components/PageShell';
import DemoPreview from '../components/projects/DemoPreview';
import CoverThumb from '../components/projects/CoverThumb';
import ProjectMeta from '../components/projects/ProjectMeta';
import { previewFor } from '../components/projects/preview-config';
import { useContent } from '../hooks/useContent';

export default function ProjectsPage() {
  const { data, loading, error } = useContent();
  const projects = data?.projects ?? [];
  const [index, setIndex] = useState(0);

  // 数据到达后索引一定有效；数据变化时把当前索引兜底到有效范围
  useEffect(() => {
    if (projects.length > 0 && index >= projects.length) setIndex(0);
  }, [projects.length, index]);

  const touchX = useRef(null);
  const total = projects.length;
  const p = projects[index];

  const next = () => total > 1 && setIndex((i) => (i + 1) % total);
  const prev = () => total > 1 && setIndex((i) => (i - 1 + total) % total);

  if (loading) {
    return (
      <PageShell wide>
        <h1 className="text-2xl font-bold tracking-tight text-ink">作品</h1>
        <p className="py-8 text-sm text-ink-faint">加载中…</p>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell wide>
        <h1 className="text-2xl font-bold tracking-tight text-ink">作品</h1>
        <p className="py-8 text-sm text-ink-faint">内容加载失败，请确认后端服务已启动。</p>
      </PageShell>
    );
  }

  if (total === 0) {
    return (
      <PageShell wide>
        <h1 className="text-2xl font-bold tracking-tight text-ink">作品</h1>
        <p className="py-8 text-sm text-ink-faint">还没有作品。</p>
      </PageShell>
    );
  }

  // 把后端数据补上前端动画配置 preview（与作品详情页共用 preview-config）
  const item = { ...p, preview: previewFor(p.id) };

  return (
    <PageShell wide>
      <h1 className="text-2xl font-bold tracking-tight text-ink">作品</h1>
      {/* 相册式展示：当前作品 + 自动播放预览；左右箭头 / 滑动 / 缩略图切换 */}
      <div
        className="relative mt-6"
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
        {/* 切换控件 + 页码：箭头放进主区，避免侧栏挤压后仍按视口宽度定位 */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prev}
              disabled={total <= 1}
              aria-label="上一个作品"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] text-ink-muted transition-colors hover:border-black/[0.16] hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[0.1] dark:hover:border-white/[0.2]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              disabled={total <= 1}
              aria-label="下一个作品"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] text-ink-muted transition-colors hover:border-black/[0.16] hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[0.1] dark:hover:border-white/[0.2]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="text-xs tabular-nums text-ink-faint">
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        </div>

        {/* 主展示卡片（key 强制重挂载 → 预览从头播放） */}
        <div
          key={item.id}
          className="animate-[fade-in-up_0.4s_ease_both] relative surface-elevated rounded-2xl border border-black/[0.06] dark:border-white/[0.06]"
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
        </div>

      </div>

      {/* 底部缩略图导航：所有作品，当前高亮，点击直达（移动端主切换方式） */}
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
            {/* 悬停显示作品名称 */}
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/[0.08] surface-elevated px-2 py-1 text-[11px] text-ink-soft opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:border-white/[0.08]">
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
