import { Link } from 'react-router-dom';
import BgGrid from '../components/chat/BgGrid';
import { useChatDock } from '../components/chat/ChatDockContext';
import { useContent } from '../hooks/useContent';
import { formatDate, SITE_QUOTE } from '../data/mockData';
import { SITE_ABOUT, SITE_CONTACT } from '../data/siteInfo';
import { IconSparkle } from '../components/icons';

const KIND = {
  posts: { label: '博客', to: '/blog' },
  notes: { label: '笔记', to: '/notes' },
  projects: { label: '作品', to: '/projects' },
};

export default function HomePage() {
  const { data, loading, error } = useContent();
  const { openChat } = useChatDock();

  const posts = data?.posts ?? [];
  const notes = data?.notes ?? [];
  const projects = data?.projects ?? [];

  const intro = '在 AI 与工程实践的交汇处，记录想法、作品与阅读。';

  const latest = [
    ...posts.map((item) => ({ ...item, kind: 'posts' })),
    ...notes.map((item) => ({ ...item, kind: 'notes' })),
    ...projects.map((item) => ({ ...item, kind: 'projects' })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6)
    .map((item) => ({
      ...item,
      kindLabel: KIND[item.kind].label,
      to: item.to || KIND[item.kind].to,
    }));

  const cards = [
    { key: 'posts', label: '博客', to: '/blog', count: posts.length, items: posts },
    { key: 'notes', label: '笔记', to: '/notes', count: notes.length, items: notes },
    { key: 'projects', label: '作品', to: '/projects', count: projects.length, items: projects },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-28 pt-8 sm:px-8 lg:px-12 lg:pt-14">
      {/* 首屏：内容名片 + 极淡网格，保留原来的空间气质但不做对话入口 */}
      <section className="relative -mx-6 overflow-hidden px-6 pb-12 pt-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <BgGrid />
        </div>

        <div className="relative">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-faint">
            Personal Site / {new Date().getFullYear()}
          </p>
          <h1 className="mt-4 text-[38px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[46px]">
            New-King
          </h1>
          <p className="mt-5 max-w-[560px] text-[15px] leading-8 text-ink-soft">{intro}</p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              to="/blog"
              className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-white shadow-apple transition-all duration-200 hover:bg-accent-hover active:scale-95"
            >
              浏览博客
            </Link>
            <Link
              to="/projects"
              className="rounded-full border border-black/[0.08] bg-card/70 px-5 py-2.5 text-[13px] text-ink-soft transition-all duration-200 hover:border-black/[0.16] hover:text-ink active:scale-95 dark:border-white/[0.1] dark:bg-white/[0.04] dark:hover:border-white/[0.2]"
            >
              查看作品
            </Link>
            <button
              type="button"
              onClick={() => openChat('')}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              <IconSparkle className="h-3.5 w-3.5" />
              问我任何问题
            </button>
          </div>

          <p className="mt-5 text-[11px] text-ink-faint">
            {loading
              ? '正在加载内容…'
              : error
                ? '内容加载失败'
                : `${posts.length} 篇博客 · ${notes.length} 篇笔记 · ${projects.length} 个作品`}
          </p>
        </div>
      </section>

      {/* 最近更新：跨类型混排，进站先看到“最近发生了什么” */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4 border-b border-black/[0.08] pb-3 dark:border-white/[0.08]">
          <h2 className="text-[13px] font-medium text-ink">最近更新</h2>
          <Link
            to="/blog"
            className="text-[11px] text-ink-faint transition-colors hover:text-ink"
          >
            查看博客 →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 pt-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-2.5 w-8 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/10" />
                <div
                  className="h-2.5 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/10"
                  style={{ width: `${58 - i * 6}%` }}
                />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-[12px] leading-6 text-ink-faint">
            内容加载失败，请确认后端服务已启动后刷新。
          </p>
        ) : latest.length === 0 ? (
          <p className="py-6 text-[12px] text-ink-faint">还没有内容。</p>
        ) : (
          <ul>
            {latest.map((item) => (
              <li key={`${item.kindLabel}-${item.id}`}>
                <Link
                  to={item.to}
                  className="group flex items-center gap-4 border-b border-black/[0.05] py-3.5 dark:border-white/[0.06]"
                >
                  <span className="w-8 shrink-0 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                    {item.kindLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink-soft transition-colors duration-200 group-hover:text-ink">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
                    {formatDate(item.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 三个入口：给第一次来的人一个清晰的内容结构 */}
      {!error && (
        <section className="mt-14 grid gap-3 sm:grid-cols-3">
          {loading
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[148px] animate-pulse rounded-2xl border border-black/[0.06] bg-card dark:border-white/[0.06]"
                />
              ))
            : cards.map((card) => {
                const latestItem = card.items[0];
                return (
                  <Link
                    key={card.key}
                    to={card.to}
                    className="group rounded-2xl border border-black/[0.06] bg-card p-5 shadow-apple transition-all duration-200 hover:-translate-y-0.5 hover:shadow-apple-lg dark:border-white/[0.06]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-ink">{card.label}</span>
                      <span className="text-[11px] tabular-nums text-ink-faint">{card.count}</span>
                    </div>
                    <p className="mt-6 truncate text-[13px] text-ink-muted">
                      {latestItem?.title || '暂无内容'}
                    </p>
                    <span className="mt-3 inline-block text-[11px] text-ink-faint transition-colors group-hover:text-ink">
                      进入 →
                    </span>
                  </Link>
                );
              })}
        </section>
      )}

      {/* 原「关于我 / 联系方式」页面已并入概览 */}
      <section className="mt-16 border-t border-black/[0.08] pt-8 dark:border-white/[0.08]">
        <h2 className="text-[13px] font-medium text-ink">关于我</h2>
        <div className="mt-3 max-w-[560px] space-y-3 text-[14px] leading-7 text-ink-soft">
          {SITE_ABOUT.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <h2 className="mt-8 text-[13px] font-medium text-ink">联系方式</h2>
        <div className="mt-3 space-y-1.5 text-[14px] leading-7 text-ink-soft">
          <p>
            邮箱：
            <a
              href={`mailto:${SITE_CONTACT.email}`}
              className="underline decoration-black/10 underline-offset-4 transition-colors hover:text-ink dark:decoration-white/15"
            >
              {SITE_CONTACT.email}
            </a>
          </p>
          <p>电话：{SITE_CONTACT.phone}</p>
        </div>
      </section>

      <blockquote className="mt-16 border-t border-black/[0.08] pt-8 text-[13px] leading-7 text-ink-faint dark:border-white/[0.08]">
        “{SITE_QUOTE}”
      </blockquote>
    </div>
  );
}
