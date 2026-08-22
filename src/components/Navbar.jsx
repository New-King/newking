import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { formatDateShort, latestGroups } from '../data/mockData';
import { useContent } from '../hooks/useContent';
import { IconMail, IconMenu, IconPhone, IconX } from './icons';

const IDLE_MS = 5000; // 鼠标闲置多久后隐藏导航
const NAV_BAR_H_PX = 56; // 与 h-14 一致
const NAV_WAKE_ZONE_PX = NAV_BAR_H_PX * 2; // 鼠标进入顶部约两条栏高才唤出菜单

// 联系方式的兜底（内容 API 拉取前先用空壳；有数据后替换）
const NAV = [
  { label: '首页', to: '/' },
  { label: '博客', to: '/blog', type: 'posts', width: 'w-72' },
  { label: '项目', to: '/projects', type: 'projects', width: 'w-72' },
  { label: '笔记', to: '/notes', type: 'notes', width: 'w-72' },
  { label: '联系', to: '/contact', contact: true, width: 'w-64' },
];

function ListPanel({ groups }) {
  return (
    <div className="space-y-3 p-1">
      {groups.map((g) => (
        <div key={g.date} className="flex gap-2">
          <span className="w-11 shrink-0 pt-1 text-center text-[11px] tabular-nums text-ink-faint dark:text-ink-muted">
            {formatDateShort(g.date)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {g.items.map((it) => (
              <Link
                key={it.id}
                to={it.to}
                className="truncate rounded-md px-1.5 py-1 text-[13px] text-ink-soft transition-colors hover:bg-neutral-100 hover:text-ink dark:hover:bg-white/10"
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

function ContactPanel({ contact }) {
  return (
    <div className="space-y-0.5 p-1">
      {contact?.email && (
        <a
          href={`mailto:${contact.email}`}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-soft transition-colors hover:bg-neutral-100 dark:hover:bg-white/10"
        >
          <IconMail className="h-4 w-4 shrink-0 text-ink-faint dark:text-ink-muted" />
          {contact.email}
        </a>
      )}
      {contact?.phone && (
        <a
          href={`tel:${contact.phone}`}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-soft transition-colors hover:bg-neutral-100 dark:hover:bg-white/10"
        >
          <IconPhone className="h-4 w-4 shrink-0 text-ink-faint dark:text-ink-muted" />
          {contact.phone}
        </a>
      )}
      {!contact?.email && !contact?.phone && (
        <p className="px-2.5 py-2 text-[13px] text-ink-faint">暂无联系方式</p>
      )}
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const idleTimerRef = useRef(null);
  const autoHideRef = useRef(false);
  const hiddenRef = useRef(false);
  const { data } = useContent();

  // 按导航项类型从内容数据里取该类型的列表（供 hover 下拉展示最新几条）
  const itemGroups = (item) => {
    const list = item.type ? (data?.[item.type] ?? []) : [];
    return latestGroups(list);
  };

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
    hiddenRef.current = hidden;
    window.dispatchEvent(new CustomEvent('nav-visibility', { detail: { hidden } }));
  }, [hidden]);

  // 显示导航并重置闲置计时
  const show = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    setHidden(false);
    idleTimerRef.current = setTimeout(() => {
      if (autoHideRef.current) setHidden(true);
    }, IDLE_MS);
  }, []);

  // 自动隐藏开启时：隐藏态仅顶部热区唤出；已显示时任意移动可续期
  const maybeWakeOnMove = useCallback(
    (e) => {
      if (!autoHideRef.current) {
        show();
        return;
      }
      if (hiddenRef.current) {
        if (e.clientY <= NAV_WAKE_ZONE_PX) show();
      } else {
        show();
      }
    },
    [show]
  );

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
    };
    const onAutoOff = () => {
      autoHideRef.current = false;
      clearTimeout(idleTimerRef.current);
      setHidden(false);
    };
    // 鼠标移入顶部热区才唤出；已显示时移动可续期。滚轮不用于从隐藏态唤醒。
    const onMouseDown = (e) => {
      if (!autoHideRef.current || e.clientY <= NAV_WAKE_ZONE_PX) show();
    };
    const onWheel = () => {
      if (!autoHideRef.current || !hiddenRef.current) show();
    };
    window.addEventListener('nav-hide', onNavHide);
    window.addEventListener('nav-autohide-on', onAutoOn);
    window.addEventListener('nav-autohide-off', onAutoOff);
    window.addEventListener('mousemove', maybeWakeOnMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    show(); // 初始：显示并启动闲置计时
    return () => {
      clearTimeout(idleTimerRef.current);
      window.removeEventListener('nav-hide', onNavHide);
      window.removeEventListener('nav-autohide-on', onAutoOn);
      window.removeEventListener('nav-autohide-off', onAutoOff);
      window.removeEventListener('mousemove', maybeWakeOnMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('wheel', onWheel);
    };
  }, [show, maybeWakeOnMove, canAutoHide]);

  return (
    <>
      <header
      className={`site-nav fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-smooth ${
        hidden ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* 桌面端：居中菜单 */}
      <nav aria-label="主导航" className="mx-auto hidden h-14 max-w-4xl items-center justify-center px-4 md:flex">
        <ul className="flex items-center">
          {NAV.map((item) => {
            const hasPanel = item.type || item.contact;
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
                      isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      <span
                        className={`absolute inset-x-4 -bottom-px h-px rounded-full bg-ink transition-all duration-300 dark:bg-white/50 ${
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
                      className={`${item.width} surface-elevated rounded-2xl border border-black/[0.06] p-2.5 dark:border-white/[0.06]`}
                    >
                      {item.contact ? (
                        <ContactPanel contact={data?.contact} />
                      ) : (
                        <ListPanel groups={itemGroups(item)} />
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
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink dark:hover:bg-white/10"
        >
          {drawerOpen ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </button>
      </div>

      {/* 移动端：抽屉面板（实心白，无毛玻璃，省移动端 GPU） */}
      <div
        className={`site-nav-mobile absolute inset-x-0 top-full z-50 transition-all duration-200 ease-smooth md:hidden ${
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
                  isActive ? 'bg-neutral-100 text-ink dark:bg-white/10' : 'text-ink-muted hover:bg-neutral-50 dark:hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      </header>

      {/* 移动端：抽屉遮罩（点击外部区域关闭抽屉），透明不遮视觉。
          注意：必须放在 header 外——header 有 transform（translate-y-0），
          fixed 子元素会相对 header 定位而不是视口，放里面遮罩只有 header 高，
          页面其余区域点不到。 */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 transition-opacity duration-200 md:hidden ${
          drawerOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      />
    </>
  );
}
