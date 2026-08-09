import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { contact, formatDateShort, latestGroups, notes, posts, projects, SITE_QUOTE } from '../data/mockData';
import { IconMail, IconMenu, IconPhone, IconX } from './icons';

const IDLE_MS = 5000; // 鼠标闲置多久后隐藏导航

const NAV = [
  { label: '首页', to: '/', quote: true, width: 'w-80' },
  { label: '博客', to: '/blog', groups: () => latestGroups(posts), width: 'w-72' },
  { label: '项目', to: '/projects', groups: () => latestGroups(projects), width: 'w-72' },
  { label: '笔记', to: '/notes', groups: () => latestGroups(notes), width: 'w-72' },
  { label: '联系', to: '/contact', contact: true, width: 'w-64' },
];

function QuotePanel() {
  return (
    <p className="px-3 py-2 text-center text-[13px] leading-6 text-neutral-500">{SITE_QUOTE}</p>
  );
}

function ListPanel({ groups }) {
  return (
    <div className="space-y-3 p-1">
      {groups.map((g) => (
        <div key={g.date} className="flex gap-2">
          <span className="w-11 shrink-0 pt-1 text-center text-[11px] tabular-nums text-neutral-400">
            {formatDateShort(g.date)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {g.items.map((it) => (
              <Link
                key={it.id}
                to={it.to}
                className="truncate rounded-md px-1.5 py-1 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                {it.title}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactPanel() {
  return (
    <div className="space-y-0.5 p-1">
      <p className="px-2.5 pb-1.5 pt-1 text-[11px] text-neutral-400">联系方式</p>
      <a
        href={`mailto:${contact.email}`}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100"
      >
        <IconMail className="h-4 w-4 shrink-0 text-neutral-400" />
        {contact.email}
      </a>
      <a
        href={`tel:${contact.phone}`}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100"
      >
        <IconPhone className="h-4 w-4 shrink-0 text-neutral-400" />
        {contact.phone}
      </a>
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [autoHide, setAutoHide] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const idleTimerRef = useRef(null);
  const autoHideRef = useRef(false);

  // 触屏/移动端（无悬停指针）不启用自动隐藏，导航常显，避免隐藏后无法唤出
  const [canAutoHide, setCanAutoHide] = useState(
    () => window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = () => setCanAutoHide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // 路由切换后强制关闭所有下拉面板与移动端抽屉
  useEffect(() => {
    setOpen(null);
    setDrawerOpen(false);
  }, [location.pathname]);

  // 导航可见性变化时通知页面（聊天区据此调整顶部预留条与滚动位置）
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nav-visibility', { detail: { hidden } }));
  }, [hidden]);

  // 显示导航：鼠标交互立即恢复，并重置闲置计时（到时仅在启用自动隐藏时隐藏）
  const show = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    setHidden(false);
    idleTimerRef.current = setTimeout(() => {
      if (autoHideRef.current) setHidden(true);
    }, IDLE_MS);
  }, []);

  useEffect(() => {
    if (!canAutoHide) return; // 触屏/移动端：导航常显，不做闲置隐藏
    // 对话发出后立即隐藏导航
    const onNavHide = () => {
      clearTimeout(idleTimerRef.current);
      setHidden(true);
    };
    // 启用 / 禁用自动隐藏（无对话时导航常显）
    const onAutoOn = () => {
      autoHideRef.current = true;
      setAutoHide(true);
    };
    const onAutoOff = () => {
      autoHideRef.current = false;
      setAutoHide(false);
      clearTimeout(idleTimerRef.current);
      setHidden(false);
    };
    // 鼠标交互（移动、点击、滚轮）显示导航；打字（按键）不算鼠标移动，不唤醒。
    // 注意：不能用 scroll —— 聊天区自动滚动也会触发 scroll 事件，会把刚隐藏的导航又唤醒。
    const WAKERS = ['mousemove', 'mousedown', 'wheel', 'touchstart'];
    window.addEventListener('nav-hide', onNavHide);
    window.addEventListener('nav-autohide-on', onAutoOn);
    window.addEventListener('nav-autohide-off', onAutoOff);
    WAKERS.forEach((ev) => window.addEventListener(ev, show, { passive: true }));
    show(); // 初始：显示并启动闲置计时
    return () => {
      clearTimeout(idleTimerRef.current);
      window.removeEventListener('nav-hide', onNavHide);
      window.removeEventListener('nav-autohide-on', onAutoOn);
      window.removeEventListener('nav-autohide-off', onAutoOff);
      WAKERS.forEach((ev) => window.removeEventListener(ev, show));
    };
  }, [show, canAutoHide]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-neutral-200/70 bg-white transition-all duration-300 ease-smooth md:bg-white/70 md:backdrop-blur-md ${
        hidden ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* 桌面端：居中菜单 */}
      <nav aria-label="主导航" className="mx-auto hidden h-14 max-w-4xl items-center justify-center px-4 md:flex">
        <ul className="flex items-center">
          {NAV.map((item) => {
            const hasPanel = item.groups || item.contact || item.quote;
            const isOpen = open === item.label;
            return (
              <li
                key={item.to}
                className="group relative"
                onMouseEnter={() => setOpen(item.label)}
                onMouseLeave={() => setOpen(null)}
              >
                <NavLink
                  to={item.to}
                  onClick={() => setOpen(null)}
                  className={({ isActive }) =>
                    `relative flex h-14 items-center px-4 text-[14px] transition-colors duration-200 ${
                      isActive ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      <span
                        className={`absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-neutral-900 transition-all duration-300 ${
                          isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                        }`}
                      />
                    </>
                  )}
                </NavLink>

                {hasPanel && (
                  <div
                    className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 transition-all duration-200 ease-smooth ${
                      isOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'
                    }`}
                  >
                    <div
                      className={`${item.width} rounded-xl border border-neutral-200/80 bg-white p-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.15)]`}
                    >
                      {item.quote ? (
                        <QuotePanel />
                      ) : item.contact ? (
                        <ContactPanel />
                      ) : (
                        <ListPanel groups={item.groups()} />
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 移动端：右上角抽屉按钮 */}
      <div className="relative flex h-14 items-center justify-end px-4 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={drawerOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          {drawerOpen ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </button>
      </div>

      {/* 移动端：抽屉面板（实心白，无毛玻璃，省移动端 GPU） */}
      <div
        className={`absolute inset-x-0 top-full z-50 border-b border-neutral-200/70 bg-white transition-all duration-200 ease-smooth md:hidden ${
          drawerOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
        }`}
      >
        <nav aria-label="移动端导航" className="px-4 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-3 text-[15px] transition-colors ${
                  isActive ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
