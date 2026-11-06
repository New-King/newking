import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatDock from '../chat/ChatDock';
import { IconMenu } from '../icons';

export default function AppLayout() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 路由切换后的抽屉行为：
  // 进入历史列表 / 某个版本（还没选具体页面）时保持打开；
  // 选中具体截图页或离开历史模式时收起。
  useEffect(() => {
    const keepOpen = pathname === '/history' || /^\/history\/[^/]+$/.test(pathname);
    if (keepOpen) return;
    setMobileOpen(false);
  }, [pathname]);

  // 抽屉打开时锁定背景滚动
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Esc 关闭抽屉
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-page">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* 移动端：抽屉遮罩（放在 Sidebar 之后、topbar 之前，保证层级正确） */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      />

      {/* 移动端顶栏 */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-black/[0.06] bg-page/85 px-4 backdrop-blur-xl dark:border-white/[0.08] lg:hidden">
        <Link
          to="/"
          className="text-[15px] font-semibold tracking-tight text-ink transition-opacity hover:opacity-70"
        >
          New-King
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="打开目录"
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </header>

      <main className="min-h-dvh pt-14 lg:pl-[264px] lg:pt-0">
        <Outlet />
      </main>

      {!pathname.startsWith('/history') && (
        <div className={mobileOpen ? 'hidden lg:block' : ''}>
          <ChatDock />
        </div>
      )}
    </div>
  );
}
