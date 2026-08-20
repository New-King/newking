import { useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import { formatDate } from '../data/mockData';
import { useContent } from '../hooks/useContent';
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
        `<button class="chat-codeblock-copy" data-code="${encodeURIComponent(text)}">复制</button>` +
        `</div>` +
        `<pre class="chat-codeblock-pre"><code>${highlighted}</code></pre>` +
        `</div>\n`
      );
    },
  },
});

const EYEBROW = { posts: 'Blog', notes: 'Notes', projects: 'Projects' };
const LIST_ROUTE = { posts: '/blog', notes: '/notes', projects: '/projects' };

export default function ContentDetail({ type }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useContent();
  const list = data?.[type] ?? [];
  const bodyRef = useRef(null);

  const item = useMemo(() => list.find((i) => i.id === id), [list, id]);
  const html = useMemo(() => (item?.content ? marked.parse(item.content) : ''), [item]);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  // 复制按钮：事件委托挂载到 article 容器
  const handleCopy = useCallback((e) => {
    const btn = e.target.closest('.chat-codeblock-copy');
    if (!btn) return;
    const raw = decodeURIComponent(btn.dataset.code || '');
    if (!raw) return;
    navigator.clipboard.writeText(raw).then(() => {
      btn.textContent = '已复制';
      setTimeout(() => { btn.textContent = '复制'; }, 1500);
    });
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    el.addEventListener('click', handleCopy);
    return () => el.removeEventListener('click', handleCopy);
  }, [handleCopy, html]);

  return (
    <PageShell
      eyebrow={EYEBROW[type]}
      headerRight={
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate(LIST_ROUTE[type] || '/');
          }}
          className="cursor-pointer text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
        >
          ← 返回列表
        </button>
      }
    >
      {loading ? (
        <p className="py-8 text-sm text-ink-faint">加载中…</p>
      ) : !item ? (
        <div className="py-8">
          <p className="text-sm text-ink-faint">未找到该文章。</p>
          <Link to="/" className="mt-3 inline-block text-sm text-ink underline">返回</Link>
        </div>
      ) : (
        <article className="mt-6" ref={bodyRef}>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{item.title}</h1>
            <p className="shrink-0 text-xs tabular-nums text-ink-faint">{formatDate(item.date)}</p>
          </div>
          {item.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>
          )}
          <div
            className="article-body mt-8 space-y-5 text-[15px] leading-7 text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      )}
    </PageShell>
  );
}
