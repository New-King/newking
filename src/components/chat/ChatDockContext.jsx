import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ChatDockContext = createContext(null);

/**
 * 全局 AI 浮层的开关与草稿。
 * 页面里的「AI 摘要」「问我任何问题」通过 openChat(预设问题) 唤起右下角面板。
 */
export function ChatDockProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const openChat = useCallback((text = '') => {
    setDraft(text);
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => setOpen(false), []);
  const toggleChat = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, draft, openChat, closeChat, toggleChat }),
    [open, draft, openChat, closeChat, toggleChat]
  );

  return <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>;
}

export function useChatDock() {
  const ctx = useContext(ChatDockContext);
  if (!ctx) throw new Error('useChatDock 必须在 ChatDockProvider 内使用');
  return ctx;
}
