import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ChatDockProvider } from './components/chat/ChatDockContext';
import ContentDetail from './components/ContentDetail';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';
import ProjectsPage from './pages/ProjectsPage';
import NotesPage from './pages/NotesPage';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import HistoryPage from './pages/HistoryPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ChatDockProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:id" element={<ContentDetail type="posts" />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ContentDetail type="projects" />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:id" element={<ContentDetail type="notes" />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:id" element={<NewsDetailPage />} />
            <Route path="/history/*" element={<HistoryPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </ChatDockProvider>
    </BrowserRouter>
  );
}
