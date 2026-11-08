import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import MessageItem from './MessageItem';
import { IconPause, IconSend, IconSparkle, IconTrash, IconX } from '../icons';
import { useChatDock } from './ChatDockContext';

// 空状态只保留 3 条，避免把面板做成第二个首页
const SUGGESTIONS = ['做下自我介绍', '看下你的作品集', '介绍一下这个网站'];

export default function ChatDock() {
  const { open, draft, openChat, closeChat } = useChatDock();
  const { messages, pending, paused, send, pause, clear, hasMessages } = useChat();
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stuckRef = useRef(true);

  // 打开时带入页面预设问题（如「总结这篇文章」）
  useEffect(() => {
    if (!open) return undefined;
    setInput(draft || '');
    const t = setTimeout(() => {
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        inputRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(t);
  }, [open, draft]);

  // 打开面板 / 新消息时贴底（用户主动向上翻时不再拽回）
  useEffect(() => {
    if (!open) return;
    stuckRef.current = true;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stuckRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  // 移动端浮层打开时锁背景滚动（桌面端保持可滚动，方便边读边问）
  useEffect(() => {
    if (!open) return undefined;
    const mq = window.matchMedia('(max-width: 1023px)');
    if (!mq.matches) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeChat]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stuckRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = (text) => {
    const query = (text || '').trim();
    if (!query || (pending > 0 && !paused)) return;
    stuckRef.current = true;
    send(query);
    setInput('');
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    submit(input);
  };

  const handleClear = () => {
    if (!hasMessages) return;
    if (window.confirm('清空全部对话？')) clear();
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => openChat('')}
          aria-label="打开 AI 对话"
          title="问我"
          className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[60] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-white shadow-apple-lg transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <IconSparkle className="h-[21px] w-[21px]" />
        </button>
      )}

      {open && (
        <>
          {/* 移动端：轻遮罩，点击空白处关闭；桌面端不遮正文，方便边读边问 */}
          <div
            aria-hidden="true"
            onClick={closeChat}
            className="fixed inset-0 z-[65] bg-black/10 lg:hidden"
          />
          <section
            role="dialog"
            aria-label="AI 对话"
            className="fixed inset-x-0 bottom-0 z-[70] flex h-[88dvh] animate-fade-in-up flex-col overflow-hidden rounded-t-2xl border border-black/[0.08] bg-card shadow-apple-lg dark:border-white/[0.08] lg:inset-auto lg:bottom-5 lg:right-5 lg:h-[min(680px,calc(100dvh-2.5rem))] lg:w-[400px] lg:rounded-2xl"
          >
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.06] px-4 dark:border-white/[0.08]">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-ink-soft dark:bg-white/10">
                <IconSparkle className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">New-King Agent</p>
                <p className="text-[10px] text-ink-faint">基于站内内容回答</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {hasMessages && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="清空对话"
                  title="清空对话"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={closeChat}
                aria-label="关闭对话"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 [overflow-anchor:none]"
          >
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center px-2 pb-4 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-ink-soft dark:bg-white/10">
                  <IconSparkle className="h-5 w-5" />
                </span>
                <p className="mt-4 text-[15px] font-medium text-ink">问我任何关于这个网站的问题</p>
                <p className="mt-1.5 max-w-[260px] text-xs leading-5 text-ink-muted">
                  可以问经历、技术栈、作品，或者让 AI 推荐一篇文章。
                </p>
                <div className="mt-6 w-full space-y-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => submit(q)}
                      className="flex w-full items-center justify-between rounded-xl border border-black/[0.06] bg-page px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:border-black/[0.14] hover:text-ink dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/[0.18]"
                    >
                      {q}
                      <span aria-hidden="true" className="text-ink-faint">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((m) => (
                  <MessageItem key={m.id} message={m} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="shrink-0 border-t border-black/[0.06] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-white/[0.08]"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入你想了解的内容…"
                aria-label="输入你想了解的内容"
                className="w-full rounded-full border border-black/[0.08] bg-page py-2.5 pl-4 pr-11 text-[14px] text-ink shadow-apple-input outline-none transition-shadow duration-200 placeholder:text-ink-faint focus:shadow-apple dark:border-white/[0.08] dark:bg-white/[0.04]"
              />
              {pending > 0 && !paused ? (
                <button
                  type="button"
                  onClick={pause}
                  aria-label="暂停回复"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white transition-colors duration-200 hover:bg-accent-hover active:scale-95"
                >
                  <IconPause className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="发送"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white transition-colors duration-200 hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <IconSend className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>
          </section>
        </>
      )}
    </>
  );
}
