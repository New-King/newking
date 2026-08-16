import { useEffect, useState } from 'react';
import { IconCheck, IconLink, IconPause, IconPlay, IconSpinner } from '../icons';
import CodeBlock from './CodeBlock';

/* ---------- 链接：点击跳转的卡片 ---------- */

function LinkCard({ block }) {
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      className="group flex w-full animate-fade-in-up items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-apple transition-colors hover:bg-card-hover"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <IconLink className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink group-hover:underline">
          {block.title || block.url}
        </span>
        <span className="block truncate text-xs text-ink-faint">{block.url}</span>
      </span>
    </a>
  );
}

/* ---------- 思考过程：仅保留「正在思考」加载态（颜色深浅脉动），不展示思考内容 ---------- */

function ThinkingBlock({ block }) {
  const [hidden, setHidden] = useState(false);

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
      <span className="think-sweep text-sm text-ink-faint">正在思考</span>
    </div>
  );
}

/* ---------- 工具调用：单行扁卡片（保持全站白卡片风格） ---------- */

function ToolCallCard({ block }) {
  const running = block.status === 'running';
  const pausedState = block.status === 'paused';
  return (
    <div className="flex w-full animate-fade-in-up items-center gap-3 rounded-2xl bg-card px-4 py-2 shadow-apple">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
          running || pausedState ? 'bg-neutral-100 dark:bg-white/10' : 'bg-green-100 dark:bg-green-500/20'
        }`}
      >
        {running ? (
          <IconSpinner className="h-3 w-3 text-ink-faint" />
        ) : pausedState ? (
          <IconPause className="h-3 w-3 text-ink-faint" />
        ) : (
          <IconCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
        )}
      </span>
      <p className="min-w-0 flex-1 truncate text-xs leading-5 text-ink-faint">
        {running ? (
          <>正在调用「{block.name}」…</>
        ) : pausedState ? (
          <>已暂停「{block.name}」</>
        ) : (
          <>已调用「{block.name}」· {block.result}</>
        )}
      </p>
    </div>
  );
}

/* ---------- 流式文字 ---------- */

const textBubble =
  'w-full whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-[15px] leading-7 text-ink shadow-apple';

function TextSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-2.5 rounded-2xl bg-card px-4 py-3.5 shadow-apple">
      <div className="h-3 w-11/12 rounded bg-neutral-200/80 dark:bg-white/15" />
      <div className="h-3 w-full rounded bg-neutral-200/80 dark:bg-white/15" />
      <div className="h-3 w-3/4 rounded bg-neutral-200/80 dark:bg-white/15" />
    </div>
  );
}

function TextBlock({ block }) {
  if (block.status === 'loading') return <TextSkeleton />;
  if (block.status === 'streaming') {
    // 真流式：后端增量追加到 content，这里直接渲染 + 闪烁光标（不再重新打字）
    return (
      <div className={`${textBubble} animate-fade-in-up`}>
        {block.content}
        <span className="animate-blink text-ink-faint">▍</span>
      </div>
    );
  }
  return <div className={textBubble}>{block.content}</div>;
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
        className="w-full rounded-2xl bg-card shadow-apple"
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
    <div className="w-full animate-fade-in-up rounded-2xl bg-card p-4 shadow-apple">
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

export default function BlockRenderer({ block, paused, onDone }) {
  switch (block.type) {
    case 'thinking':
      return <ThinkingBlock block={block} />;
    case 'tool':
      return <ToolCallCard block={block} />;
    case 'text':
      return <TextBlock block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'link':
      return <LinkCard block={block} />;
    case 'code':
      return <CodeBlock block={block} />;
    case 'audio':
      return <AudioCard block={block} />;
    case 'video':
      return <VideoCard block={block} />;
    default:
      return null;
  }
}
