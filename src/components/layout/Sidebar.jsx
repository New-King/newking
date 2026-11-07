import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContent } from '../../hooks/useContent';
import { IconChevron, IconHistory, IconMail, IconX } from '../icons';
import VersionNav from './VersionNav';

// 左侧目录：内容类型 → 条目（像编辑器的文件树），点击直接进内容
export default function Sidebar({ mobileOpen = false, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, loading, error } = useContent();
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState({});
  const historyMode = pathname === '/history' || pathname.startsWith('/history/');
  const searchRef = useRef(null);

  // 主题：沿用原按钮的文案与 localStorage key
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* 隐私模式等不可写时静默失败 */
    }
  }, [dark]);

  // ⌘K / Ctrl+K 聚焦搜索
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const posts = data?.posts ?? [];
  const notes = data?.notes ?? [];
  const projects = data?.projects ?? [];
  const contact = data?.contact;

  const q = query.trim().toLowerCase();
  const matches = (text) => !q || String(text || '').toLowerCase().includes(q);

  const groups = useMemo(() => {
    const aboutChildren = [
      { key: 'about-me', label: '关于我', to: '/about' },
      { key: 'resume', label: '简历', to: '/resume' },
      { key: 'contact', label: '联系', to: '/contact' },
    ].filter((item) => matches(item.label));

    const buildSection = (key, label, to, list) => {
      const sectionMatched = matches(label);
      const items = list
        .filter((item) => sectionMatched || matches(item.title))
        .map((item) => ({
          key: item.id,
          label: item.title,
          to: item.to || `${to}/${item.id}`,
        }));
      if (q && !sectionMatched && items.length === 0) return null;
      return { key, label, to, total: list.length, items };
    };

    const writing = [
      buildSection('posts', '博客', '/blog', posts),
      buildSection('notes', '笔记', '/notes', notes),
    ].filter(Boolean);

    const work = [buildSection('projects', '项目', '/projects', projects)].filter(Boolean);

    if (q && writing.length === 0 && work.length === 0 && aboutChildren.length === 0) return [];
    return [
      ...(aboutChildren.length ? [{ key: 'about', label: '关于', children: aboutChildren }] : []),
      ...(writing.length ? [{ key: 'writing', label: '写作', children: writing }] : []),
      ...(work.length ? [{ key: 'work', label: '作品', children: work }] : []),
    ];
  }, [posts, notes, projects, q]); // matches 依赖 q，函数本身无需进依赖

  const goBack = () => {
    onClose?.();
    navigate('/');
  };

  const isOpen = (key) => (q ? true : !closed[key]);
  const toggle = (key) => setClosed((prev) => ({ ...prev, [key]: !prev[key] }));
  const isSectionActive = (to) => pathname === to || pathname.startsWith(`${to}/`);
  const isGroupActive = (group) =>
    group.children?.some((child) =>
      child.items ? isSectionActive(child.to) : pathname === child.to
    );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-black/[0.06] bg-page transition-transform duration-300 ease-smooth dark:border-white/[0.08] lg:w-[264px] lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 shadow-apple-lg' : '-translate-x-full'
      }`}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
        {historyMode ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={goBack}
              aria-label="返回当前站点"
              title="返回当前站点"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
            >
              <IconChevron className="h-4 w-4 rotate-180" />
            </button>
            <span className="truncate text-[14px] font-medium text-ink">历史版本</span>
          </div>
        ) : (
          <Link
            to="/"
            onClick={onClose}
            className="flex min-w-0 items-baseline gap-2 transition-opacity hover:opacity-70"
          >
            <span className="truncate text-[16px] font-semibold tracking-tight text-ink">New-King</span>
            <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.18em] text-ink-faint">
              Site
            </span>
          </Link>
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          {!historyMode && (
            <Link
              to="/history"
              aria-label="历史版本"
              title="历史版本"
              className="flex h-8 items-center gap-1.5 rounded-full px-2 text-[11px] text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
            >
              <IconHistory className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">历史</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭目录"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10 lg:hidden"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!historyMode && (
        <div className="shrink-0 px-3">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('');
              }}
              placeholder="搜索标题…"
              aria-label="搜索标题"
              className="w-full rounded-lg border border-black/[0.06] bg-card/70 py-1.5 pl-3 pr-10 text-[12px] text-ink outline-none transition-shadow duration-200 placeholder:text-ink-faint focus:shadow-apple-input dark:border-white/[0.08] dark:bg-white/[0.04]"
            />
            {!query && (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-black/[0.08] px-1 py-0.5 text-[9px] text-ink-faint dark:border-white/[0.12] lg:block">
                ⌘K
              </kbd>
            )}
          </div>
        </div>
      )}

      <div className={`relative min-h-0 flex-1 ${historyMode ? 'mt-1' : 'mt-3'}`}>
        <nav aria-label={historyMode ? '历史版本' : '站点目录'} className="h-full overflow-y-auto overscroll-contain px-3 pb-4">
          {historyMode ? (
            <VersionNav onClose={onClose} />
          ) : (
            <>
        <Link
          to="/"
          onClick={onClose}
          aria-current={pathname === '/' ? 'page' : undefined}
          className={`block rounded-lg px-2 py-1 text-[13px] transition-colors duration-200 ${
            pathname === '/'
              ? 'bg-black/[0.06] font-medium text-ink dark:bg-white/10'
              : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]'
          }`}
        >
          概览
        </Link>

        {loading && (
          <div className="mt-5 space-y-2 px-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-2.5 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/10"
                style={{ width: `${68 - i * 7}%` }}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="mt-4 px-2 text-[11px] leading-5 text-ink-faint">
            内容加载失败
            <br />
            请确认后端服务已启动
          </p>
        )}

        {!loading &&
          groups.map((group) => (
          <div key={group.key} className="mt-4">
            <button
              type="button"
              onClick={() => toggle(group.key)}
              aria-expanded={isOpen(group.key)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] font-medium tracking-[0.14em] transition-colors ${
                isGroupActive(group) ? 'text-ink' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {group.label}
              <IconChevron
                className={`h-3 w-3 transition-transform duration-200 ${
                  isOpen(group.key) ? 'rotate-90' : ''
                }`}
              />
            </button>

            {isOpen(group.key) && (
              <div className="mt-1 space-y-0.5">
                {group.children.map((child) =>
                  child.items ? (
                    <div key={child.key}>
                      <div className="flex items-center gap-1">
                        <Link
                          to={child.to}
                          onClick={onClose}
                          aria-current={pathname === child.to ? 'page' : undefined}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-[12.5px] transition-colors duration-200 ${
                            isSectionActive(child.to)
                              ? 'font-medium text-ink'
                              : 'text-ink-soft hover:text-ink'
                          }`}
                        >
                          <span className="truncate">{child.label}</span>
                          <span className="text-[10px] tabular-nums text-ink-faint">
                            {child.total}
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggle(child.key)}
                          aria-label={isOpen(child.key) ? `收起${child.label}` : `展开${child.label}`}
                          aria-expanded={isOpen(child.key)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
                        >
                          <IconChevron
                            className={`h-3 w-3 transition-transform duration-200 ${
                              isOpen(child.key) ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {isOpen(child.key) && (
                        <ul className="ml-[13px] mt-0.5 space-y-px border-l border-black/[0.06] pl-2 dark:border-white/[0.08]">
                          {child.items.map((item) => {
                            const active = pathname === item.to;
                            return (
                              <li key={item.key}>
                                <Link
                                  to={item.to}
                                  onClick={onClose}
                                  aria-current={active ? 'page' : undefined}
                                  className={`block truncate rounded-md py-1 pl-2 pr-2 text-[12.5px] leading-5 transition-colors duration-200 ${
                                    active
                                      ? 'bg-black/[0.06] text-ink dark:bg-white/10'
                                      : 'text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]'
                                  }`}
                                  title={item.label}
                                >
                                  {item.label}
                                </Link>
                              </li>
                            );
                          })}
                          {child.items.length === 0 && (
                            <li className="px-2 py-1 text-[11px] text-ink-faint">暂无内容</li>
                          )}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={child.key}
                      to={child.to}
                      onClick={onClose}
                      aria-current={pathname === child.to ? 'page' : undefined}
                      className={`block rounded-md px-2 py-1 text-[12.5px] transition-colors duration-200 ${
                        pathname === child.to
                          ? 'bg-black/[0.06] font-medium text-ink dark:bg-white/10'
                          : 'text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      {child.label}
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        ))}

        {q && !loading && groups.length === 0 && (
          <p className="mt-4 px-2 text-[11px] text-ink-faint">没有匹配的内容</p>
        )}
            </>
          )}
        </nav>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-page to-transparent lg:hidden"
        />
      </div>

      <div className="flex h-[calc(3rem+env(safe-area-inset-bottom))] shrink-0 items-center border-t border-black/[0.06] px-4 pb-[env(safe-area-inset-bottom)] dark:border-white/[0.08]">
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-md text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
          {contact?.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink"
            >
              <IconMail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </a>
          ) : (
            <Link to="/contact" onClick={onClose} className="text-[11px] text-ink-faint hover:text-ink">
              联系
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
