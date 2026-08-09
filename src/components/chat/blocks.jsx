import { useEffect, useState } from 'react';
import { IconCheck, IconPause, IconPlay, IconSpinner } from '../icons';
import Typewriter from './Typewriter';
import CodeBlock from './CodeBlock';

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
      className={`w-full max-w-md animate-fade-in-up px-1 py-1 transition-opacity duration-300 ease-smooth ${
        block.status === 'done' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <span className="think-sweep text-sm text-neutral-400">正在思考</span>
    </div>
  );
}

/* ---------- 工具调用卡片：进行中 / 已完成 ---------- */

function ToolCallCard({ block }) {
  const running = block.status === 'running';
  const pausedState = block.status === 'paused';
  return (
    <div
      className={`w-full max-w-md animate-fade-in-up rounded-xl border bg-white px-4 py-3 ${
        running ? 'border-neutral-200' : 'border-neutral-200/70'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
            running ? 'bg-neutral-100' : 'bg-neutral-900'
          }`}
        >
          {running ? (
            <IconSpinner className="h-3.5 w-3.5 text-neutral-500" />
          ) : pausedState ? (
            <IconPause className="h-3.5 w-3.5 text-white" />
          ) : (
            <IconCheck className="h-3.5 w-3.5 text-white" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-800">
            {running ? (
              <>正在调用「{block.name}」</>
            ) : pausedState ? (
              <>已暂停「{block.name}」</>
            ) : (
              <>已调用「{block.name}」</>
            )}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {running ? '正在执行，请稍候…' : pausedState ? '回复生成已暂停' : block.result}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- 流式文字 ---------- */

const textBubble =
  'w-full max-w-md whitespace-pre-wrap rounded-2xl rounded-tl-md bg-neutral-100 px-4 py-3 text-[15px] leading-7 text-neutral-800';

function TextSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse space-y-2.5 rounded-2xl bg-neutral-100 px-4 py-3.5">
      <div className="h-3 w-11/12 rounded bg-neutral-200/80" />
      <div className="h-3 w-full rounded bg-neutral-200/80" />
      <div className="h-3 w-3/4 rounded bg-neutral-200/80" />
    </div>
  );
}

function TextBlock({ block, paused, onDone }) {
  if (block.status === 'loading') return <TextSkeleton />;
  if (block.status === 'streaming') {
    return (
      <div className={`${textBubble} animate-fade-in-up`}>
        {/* 必须把 block.id 传给 onDone，驱动才能按 id 找到完成回调继续往下走 */}
        <Typewriter text={block.content} onDone={() => onDone(block.id)} active={!paused} />
      </div>
    );
  }
  return <div className={textBubble}>{block.content}</div>;
}

/* ---------- 图片 ---------- */

function ImageBlock({ block }) {
  if (block.status !== 'done') {
    return (
      <div className="h-56 w-full max-w-md animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
    );
  }
  return (
    <figure className="w-full max-w-md animate-fade-in-up">
      <img
        src={block.src}
        alt={block.caption || '示意图'}
        className="w-full rounded-xl border border-neutral-200 bg-white"
      />
      {block.caption && <figcaption className="mt-2 text-xs text-neutral-400">{block.caption}</figcaption>}
    </figure>
  );
}

/* ---------- 音频：播放按钮 + 波形占位 ---------- */

const EQ_BARS = [28, 52, 80, 42, 90, 60, 34, 72, 48, 82, 40, 64, 30];

function AudioCard({ block }) {
  const [playing, setPlaying] = useState(false);
  if (block.status !== 'done') {
    return <div className="h-[76px] w-full max-w-md animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />;
  }
  return (
    <div className="w-full max-w-md animate-fade-in-up rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? '暂停' : '播放'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-700"
        >
          {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4 translate-x-px" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-neutral-800">{block.title}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-6 items-end gap-[3px]" aria-hidden="true">
              {EQ_BARS.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
                  className={`w-[3px] origin-bottom rounded-full bg-neutral-400 ${
                    playing ? 'animate-eq' : ''
                  }`}
                />
              ))}
            </div>
            <span className="text-xs tabular-nums text-neutral-400">{block.duration}</span>
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
      <div className="aspect-video w-full max-w-md animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
    );
  }
  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div
        className={`relative aspect-video overflow-hidden rounded-xl border transition-colors ${
          playing ? 'border-neutral-300 bg-neutral-200/60' : 'border-neutral-200 bg-neutral-100'
        }`}
      >
        {playing ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-neutral-500">
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
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900/85 text-white transition-transform hover:scale-105">
              <IconPlay className="h-5 w-5 translate-x-px" />
            </span>
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
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
      return <TextBlock block={block} paused={paused} onDone={onDone} />;
    case 'image':
      return <ImageBlock block={block} />;
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
