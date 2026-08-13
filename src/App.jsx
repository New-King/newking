import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';
import ProjectsPage from './pages/ProjectsPage';
import NotesPage from './pages/NotesPage';
import ContactPage from './pages/ContactPage';

/* 深色模式切换（左上角；记住用户选择，localStorage 持久化） */
function ThemeToggle() {
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
  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed left-3 top-3 z-[60] flex h-8 items-center rounded-full border border-black/[0.08] bg-white/90 px-3.5 text-[11px] font-medium uppercase tracking-[0.15em] text-ink-soft shadow-apple backdrop-blur transition-colors hover:text-ink dark:border-white/10 dark:bg-[#1C1C1E]/90"
    >
      {dark ? 'Light' : 'Dark'}
    </button>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ThemeToggle />
      <Navbar />
      {/* 导航为悬浮覆盖层，不占用布局高度；隐藏时内容可占满整个视口 */}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
