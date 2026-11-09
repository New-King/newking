import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import { formatDate } from '../data/mockData';
import { sortNotes } from '../utils/contentOrder';
import { useContent } from '../hooks/useContent';
import { useChatDock } from './chat/ChatDockContext';
import { IconCheck, IconChevron, IconCopy, IconList, IconShare, IconSparkle } from './icons';
import PageShell from './PageShell';

hljs.registerLanguage('python', python);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('xml', xml);

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightCode(text, lang) {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(text, { language: lang }).value;
    }
    return hljs.highlightAuto(text).value;
  } catch {
    return escapeHtml(text);
  }
}

// marked：代码块 → chat-codeblock 结构（暗色背景 + 语言标签 + 复制按钮 + 高亮）
marked.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang || '').trim().split(/\s+/)[0];
      const highlighted = highlightCode(text, language || '');
      const langLabel = escapeHtml(language || 'code');
      return (
        `<div class="chat-codeblock">` +
        `<div class="chat-codeblock-bar">` +
        `<span class="chat-codeblock-lang">${langLabel}</span>` +
        `<button class="chat-codeblock-copy">复制</button>` +
        `</div>` +
        `<pre class="chat-codeblock-pre"><code>${highlighted}</code></pre>` +
        `</div>\n`
      );
    },
  },
});

const LIST_ROUTE = { posts: '/blog', notes: '/notes', projects: '/projects' };
const TOOLBAR_BUTTON =
  'inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-card/60 px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:bg-card hover:text-ink dark:border-white/[0.1] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]';

export default function ContentDetail({ type }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useContent();
  const { openChat } = useChatDock();
  const list = data?.[type] ?? [];
  const bodyRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const copyTimer = useRef(null);

  const item = useMemo(() => list.find((i) => i.id === id), [list, id]);

  // 渲染正文，同时给 h2/h3 生成锚点并收集目录
  const { html, toc } = useMemo(() => {
    if (!item?.content) return { html: '', toc: [] };
    const headings = [];
    let index = 0;
    const rendered = marked.parse(item.content).replace(
      /<h([23])>([\s\S]*?)<\/h\1>/g,
      (match, level, inner) => {
        const text = inner.replace(/<[^>]+>/g, '').trim();
        if (!text) return match;
        const hid = `heading-${index++}`;
        headings.push({ id: hid, text, level: Number(level) });
        return `<h${level} id="${hid}" class="scroll-mt-20 lg:scroll-mt-0">${inner}</h${level}>`;
      }
    );
    return { html: rendered, toc: headings };
  }, [item]);

  // 上一篇/下一篇：笔记按系列顺序，其余按后端列表顺序
  const ordered = useMemo(() => {
    const base = data?.[type] ?? [];
    return type === 'notes' ? sortNotes(base) : base;
  }, [data, type]);
  const currentIndex = ordered.findIndex((entry) => entry.id === id);
  const prev = currentIndex > 0 ? ordered[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < ordered.length - 1
      ? ordered[currentIndex + 1]
      : null;
  const readingMinutes = item?.content
    ? Math.max(1, Math.round(item.content.length / 400))
    : 0;

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  // 复制按钮：事件委托挂载到 article 容器
  const handleCopy = useCallback((e) => {
    const btn = e.target.closest('.chat-codeblock-copy');
    if (!btn) return;
    const code = btn.closest('.chat-codeblock')?.querySelector('code');
    if (!code) return;
    const text = code.textContent || '';
    const doCopy = (p) => p.then(() => {
      btn.textContent = '已复制';
      setTimeout(() => { btn.textContent = '复制'; }, 1500);
    });
    if (navigator.clipboard) {
      doCopy(navigator.clipboard.writeText(text));
    } else {
      // fallback: textarea + execCommand
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      doCopy(Promise.resolve(document.execCommand('copy')));
      document.body.removeChild(ta);
    }
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    el.addEventListener('click', handleCopy);
    return () => el.removeEventListener('click', handleCopy);
  }, [handleCopy, html]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  }, []);

  const shareArticle = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.title,
          text: item?.description,
          url: window.location.href,
        });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    copyLink();
  };

  return (
    <PageShell
      toolbar={
        <>
          <button
            type="button"
            onClick={() => navigate(LIST_ROUTE[type] || '/')}
            className={`${TOOLBAR_BUTTON} -ml-1`}
          >
            <IconChevron className="h-3.5 w-3.5 rotate-180" />
            返回列表
          </button>
          {item && (
            <button
              type="button"
              onClick={() =>
                openChat(`请总结《${item.title}》这篇文章的核心内容，并列出 3 个要点。`)
              }
              className={TOOLBAR_BUTTON}
            >
              <IconSparkle className="h-3.5 w-3.5" />
              AI 摘要
            </button>
          )}
          <button type="button" onClick={copyLink} className={TOOLBAR_BUTTON}>
            {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制链接'}
          </button>
          <button type="button" onClick={shareArticle} className={TOOLBAR_BUTTON}>
            <IconShare className="h-3.5 w-3.5" />
            分享
          </button>
          {toc.length > 0 && (
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              aria-expanded={tocOpen}
              className={`${TOOLBAR_BUTTON} ${tocOpen ? 'bg-card text-ink dark:bg-white/[0.08]' : ''}`}
            >
              <IconList className="h-3.5 w-3.5" />
              目录
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <p className="py-8 text-sm text-ink-faint">加载中…</p>
      ) : error ? (
        <p className="py-8 text-sm text-ink-faint">内容加载失败，请确认后端服务已启动。</p>
      ) : !item ? (
        <div className="py-8">
          <p className="text-sm text-ink-faint">未找到该文章。</p>
          <Link to="/" className="mt-3 inline-block text-sm text-ink underline">返回</Link>
        </div>
      ) : (
        <>
          {tocOpen && toc.length > 0 && (
            <nav className="mt-4 max-h-[50vh] overflow-y-auto rounded-2xl border border-black/[0.06] bg-card/60 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <ul className="space-y-0.5">
                {toc.map((heading) => (
                  <li
                    key={heading.id}
                    style={{ paddingLeft: heading.level === 3 ? 12 : 0 }}
                  >
                    <a
                      href={`#${heading.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document
                          .getElementById(heading.id)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="block truncate rounded-md px-2 py-1 text-[12.5px] text-ink-muted transition-colors hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <article className="mt-6" ref={bodyRef}>
          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 text-2xl font-bold tracking-tight text-ink">{item.title}</h1>
            <p className="shrink-0 text-xs tabular-nums text-ink-muted">
              {formatDate(item.date)}
              {readingMinutes > 0 && <span> · 约 {readingMinutes} 分钟</span>}
            </p>
          </div>
          {item.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>
          )}
          <div
            className="article-body mt-8 space-y-5 text-[15px] leading-7 text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          </article>

          {(prev || next) && (
            <nav className="mt-12 grid gap-3 border-t border-black/[0.06] pt-6 sm:grid-cols-2 dark:border-white/[0.08]">
              {prev ? (
                <Link
                  to={prev.to}
                  className="rounded-xl border border-black/[0.06] bg-card/60 p-3 transition-colors hover:bg-card dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    上一篇
                  </p>
                  <p className="mt-1 truncate text-[13px] text-ink">{prev.title}</p>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next ? (
                <Link
                  to={next.to}
                  className="rounded-xl border border-black/[0.06] bg-card/60 p-3 transition-colors hover:bg-card sm:text-right dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    下一篇
                  </p>
                  <p className="mt-1 truncate text-[13px] text-ink">{next.title}</p>
                </Link>
              ) : null}
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
