import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const HistoryScrollContext = createContext(null);

export function HistoryScrollProvider({ children }) {
  const [activeId, setActiveId] = useState(null);

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const value = useMemo(
    () => ({ activeId, setActiveId, scrollToSection }),
    [activeId, scrollToSection]
  );

  return (
    <HistoryScrollContext.Provider value={value}>{children}</HistoryScrollContext.Provider>
  );
}

export function useHistoryScroll() {
  const ctx = useContext(HistoryScrollContext);
  if (!ctx) throw new Error('useHistoryScroll 必须在 HistoryScrollProvider 内使用');
  return ctx;
}
