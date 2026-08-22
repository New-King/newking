import { useEffect, useState } from 'react';
import { marked, Parser } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml';
import { IconArrowDown, IconCheck, IconGlobe, IconLink, IconPause, IconPlay, IconSpinner, IconX } from '../icons';

// 注册 highlight.js 语言（与 CodeBlock 一致）
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('xml', xml);

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// markdown 代码块 → 高亮 HTML + 复制按钮（HTML 字符串，复制按钮用事件委托）
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

/* ---------- 链接：小条样式（多条横排，放不下换行） ---------- */

function LinkCard({ block }) {
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full animate-fade-in-up items-center gap-1.5 rounded-full border border-black/[0.08] surface-chat px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent/40 hover:text-ink dark:border-white/[0.08]"
    >
      <IconLink className="h-3 w-3 shrink-0 text-ink-faint" />
      <span className="truncate">{block.title || block.url}</span>
      <span className="shrink-0 text-ink-faint">↗</span>
    </a>
  );
}

/* ---------- 思考过程：仅保留「正在思考」加载态（颜色深浅脉动），不展示思考内容 ---------- */

function ThinkingBlock({ block }) {
  const [hidden, setHidden] = useState(() => block.status === 'done');

  useEffect(() => {
    if (block.status === 'done') {
      const t = setTimeout(() => setHidden(true), 350);
      return () => clearTimeout(t);
    }
    setHidden(false);
  }, [block.status]);

  if (hidden) return null;

  return (
    <div
      className={`w-full animate-fade-in-up px-1 py-1 transition-opacity duration-300 ease-smooth ${
        block.status === 'done' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <span className="think-sweep text-sm">正在思考</span>
    </div>
  );
}

/* ---------- 工具调用：单行扁卡片（可展开显示相关文章） ---------- */

function ToolCallCard({ block }) {
  const [open, setOpen] = useState(false);
  const running = block.status === 'running';
  const pausedState = block.status === 'paused';
  const failed = !running && !pausedState && block.ok === false; // 工具调用失败
  const related = block.related || [];
  const expandable = !running && !pausedState && related.length > 0;
  return (
    <div className="w-full animate-fade-in-up">
      <div className="flex items-center gap-3 rounded-2xl surface-chat px-4 py-2">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
            running || pausedState
              ? 'bg-neutral-100 dark:bg-white/10'
              : failed
                ? 'bg-red-100/70 dark:bg-red-500/20'
                : 'bg-green-100 dark:bg-green-500/20'
          }`}
        >
          {running ? (
            <IconSpinner className="h-3 w-3 text-ink-muted" />
          ) : pausedState ? (
            <IconPause className="h-3 w-3 text-ink-muted" />
          ) : failed ? (
            <IconX className="h-3 w-3 text-red-500 dark:text-red-300" />
          ) : (
            <IconCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
          )}
        </span>
        <p
          className={`min-w-0 flex-1 truncate text-xs leading-5 ${
            failed ? 'text-red-600 dark:text-red-300' : 'text-ink-soft'
          }`}
        >
          {running ? (
            <>正在调用「{block.name}」…</>
          ) : pausedState ? (
            <>已暂停「{block.name}」</>
          ) : failed ? (
            <>已调用「{block.name}」· {block.result}</>
          ) : (
            <>已调用「{block.name}」· {block.result}</>
          )}
        </p>
        {/* 展开箭头：仅在有相关文章且已完成后显示 */}
        {expandable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? '收起相关文章' : '展开相关文章'}
            aria-expanded={open}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink dark:hover:bg-white/10"
          >
            <IconArrowDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {/* 展开的相关文章列表 */}
      {expandable && open && (
        <div className="mt-1 space-y-0.5 rounded-2xl border border-black/[0.06] surface-chat px-3 py-2 dark:border-white/[0.06]">
          {related.map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs text-ink-soft transition-colors hover:bg-neutral-100 hover:text-ink dark:hover:bg-white/10"
            >
              <IconGlobe className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
              <span className="text-ink-muted">↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 流式文字 ---------- */

const textBubble =
  'w-full whitespace-pre-wrap rounded-2xl rounded-tl-sm surface-chat px-4 py-3 text-[15px] leading-7 text-ink';

function TextSkeleton() {
  return (
    <div className="surface-chat w-full animate-pulse space-y-2.5 rounded-2xl px-4 py-3.5">
      <div className="h-3 w-11/12 rounded bg-neutral-200/80 dark:bg-white/15" />
      <div className="h-3 w-full rounded bg-neutral-200/80 dark:bg-white/15" />
      <div className="h-3 w-3/4 rounded bg-neutral-200/80 dark:bg-white/15" />
    </div>
  );
}

// 渲染对话文本：markdown（**加粗**、`代码`、[链接]、裸URL）用 marked 解析，
// 链接/图片直接渲染，不再用 [N] 引用标注（模型已会直接输出真实链接）。
function renderMarkdownWithRefs(text) {
  // 自定义 renderer：给所有链接加"新标签页打开 + ↗ 图标"；代码块加高亮 + 复制按钮
  const renderer = new marked.Renderer();
  renderer.link = (token) => {
    const href = token.href || '';
    const title = token.title ? ` title="${token.title}"` : '';
    const parser = new Parser({ renderer });
    const content = token.tokens ? parser.parseInline(token.tokens) : (token.text || '');
    return `<a href="${href}" target="_blank" rel="noreferrer"${title} class="article-link">↗ ${content}</a>`;
  };
  renderer.code = (token) => {
    const lang = token.lang || '';
    const code = token.text || '';
    const highlighted = highlightCode(code, lang);
    return (
      `<div class="chat-codeblock">` +
      `<div class="chat-codeblock-bar">` +
      `<span class="chat-codeblock-lang">${escapeHtml(lang || 'code')}</span>` +
      `<button type="button" class="chat-codeblock-copy" data-code="${encodeURIComponent(code)}">复制</button>` +
      `</div>` +
      `<pre class="chat-codeblock-pre"><code class="language-${escapeHtml(lang)}">${highlighted}</code></pre>` +
      `</div>`
    );
  };
  // 解析 markdown（加粗/斜体/代码/链接/列表等），裸 URL 会被 marked 转成链接
  return marked.parse(text, { renderer });
}

function TextBlock({ block, related }) {
  if (block.status === 'loading') return <TextSkeleton />;
  if (block.status === 'streaming') {
    // 真流式：后端增量追加到 content，这里直接渲染 + 闪烁光标（不再重新打字）
    return (
      <div className={`${textBubble} animate-fade-in-up`}>
        {block.content}
        <span className="animate-blink text-ink-muted">▍</span>
      </div>
    );
  }
  // 处理 markdown 代码块里的"复制"按钮点击（dangerouslySetInnerHTML 里的按钮用事件委托捕获）
  const handleContainerClick = async (e) => {
    const btn = e.target.closest?.('.chat-codeblock-copy');
    if (!btn) return;
    try {
      const code = decodeURIComponent(btn.dataset.code || '');
      await navigator.clipboard.writeText(code);
      const original = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(() => {
        btn.textContent = original;
      }, 1600);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };
  // 完成态：markdown 渲染 + 代码块（高亮/复制）
  return (
    <div
      className={`${textBubble} article-body`}
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: renderMarkdownWithRefs(block.content) }}
    />
  );
}

/* ---------- 图片 ---------- */

function ImageBlock({ block }) {
  if (block.status !== 'done') {
    return (
      <div className="h-56 w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/10" />
    );
  }
  return (
    <figure className="w-full animate-fade-in-up">
      <img
        src={block.src}
        alt={block.caption || '示意图'}
        className="w-full rounded-2xl surface-chat"
      />
      {block.caption && <figcaption className="mt-2 text-xs text-ink-faint">{block.caption}</figcaption>}
    </figure>
  );
}

/* ---------- 音频：播放按钮 + 波形占位 ---------- */

const EQ_BARS = [28, 52, 80, 42, 90, 60, 34, 72, 48, 82, 40, 64, 30];

function AudioCard({ block }) {
  const [playing, setPlaying] = useState(false);
  if (block.status !== 'done') {
    return <div className="h-[76px] w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/10" />;
  }
  return (
    <div className="surface-chat w-full animate-fade-in-up rounded-2xl p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? '暂停' : '播放'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-apple transition-all duration-200 hover:bg-accent-hover active:scale-95"
        >
          {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4 translate-x-px" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{block.title}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-6 items-end gap-[3px]" aria-hidden="true">
              {EQ_BARS.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
                  className={`w-[3px] origin-bottom rounded-full bg-ink-faint ${
                    playing ? 'animate-eq' : ''
                  }`}
                />
              ))}
            </div>
            <span className="text-xs tabular-nums text-ink-faint">{block.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 视频：占位播放器 ---------- */

function VideoCard({ block }) {
  const [playing, setPlaying] = useState(false);
  if (block.status !== 'done') {
    return (
      <div className="aspect-video w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/10" />
    );
  }
  return (
    <div className="w-full animate-fade-in-up">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-neutral-100 dark:bg-white/10">
        {playing ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-ink-muted">
            <IconPause className="h-4 w-4" />
            演示播放中（占位）
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="播放演示视频"
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-apple transition-transform hover:scale-105">
              <IconPlay className="h-5 w-5 translate-x-px" />
            </span>
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        {block.title} · {block.duration}
      </p>
    </div>
  );
}

/* ---------- 统一出口 ---------- */

export default function BlockRenderer({ block, paused, onDone, related }) {
  switch (block.type) {
    case 'thinking':
      return <ThinkingBlock block={block} />;
    case 'tool':
      return <ToolCallCard block={block} />;
    case 'text':
      return <TextBlock block={block} related={related} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'link':
      return <LinkCard block={block} />;
    case 'audio':
      return <AudioCard block={block} />;
    case 'video':
      return <VideoCard block={block} />;
    default:
      return null;
  }
}

