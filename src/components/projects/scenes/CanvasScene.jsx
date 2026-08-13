import { useEffect, useState } from 'react';

// 画布场景：左无限画布 + 右对话 Agent
// 流程：用户消息 → AI 找灵感（对话区九宫格）→ 文本 → 视觉设定图（对话区 3 张，带加载）
//      → 设定图加载完成 → 画布同时出现 3 张图 → 停留循环
// 对话区底部为静态输入框（装饰，不模拟打字）
const PHASES = [800, 900, 1600, 1200, 1800, 1400, 1800]; // 一轮约 9.5s
const USER_TEXT = '帮我制作一个 xxx 视频';

export default function CanvasScene() {
  const [phase, setPhase] = useState(0);

  // 相位推进（循环）
  useEffect(() => {
    const t = setTimeout(
      () => setPhase((p) => (p + 1) % PHASES.length),
      PHASES[phase]
    );
    return () => clearTimeout(t);
  }, [phase]);

  // 对话气泡（渐入）
  const msg = (side, show, children, delay = 0) => (
    <div
      className={`transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      }`}
      style={{ transitionDelay: show ? `${delay}ms` : '0ms' }}
    >
      <div
        className={`max-w-[95%] rounded-md px-2 py-1 text-[10px] leading-snug ${
          side === 'user'
            ? 'ml-auto bg-ink/10 text-ink-soft dark:bg-white/10'
            : 'bg-black/[0.04] text-ink-soft dark:bg-white/[0.06]'
        }`}
      >
        {children}
      </div>
    </div>
  );

  // 灰阶图片占位（对话区小图 / 画布大图共用）
  const tile = (size, show, delay = 0, label = null) => (
    <div
      className={`relative shrink-0 rounded-[4px] border border-black/[0.08] bg-gradient-to-br from-black/[0.03] to-black/[0.07] transition-all duration-300 dark:border-white/15 dark:from-white/[0.05] dark:to-white/[0.1] ${size}`}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'none' : 'translateY(3px)',
        transitionDelay: show ? `${delay}ms` : '0ms',
      }}
    >
      {label && (
        <span className="absolute bottom-0.5 right-1 text-[8px] tabular-nums text-ink-faint">
          {label}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex aspect-[16/9]">
      {/* 左：无限画布（60%）—— 全程为空，直到 phase 5 同时出现 3 张图 */}
      <div className="relative w-[60%] overflow-hidden border-r border-black/[0.06] dark:border-white/10">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div
          className="absolute inset-x-0 top-5 flex gap-3 px-5 transition-all duration-500"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transform: phase >= 5 ? 'none' : 'translateY(6px)',
          }}
        >
          {[1, 2, 3].map((n) => tile('aspect-[4/3] flex-1', true, n * 100, String(n).padStart(2, '0')))}
        </div>
      </div>

      {/* 右：对话区（40%），内容流式向下 + 底部固定输入框 */}
      <div className="flex w-[40%] flex-col p-2.5">
        <div className="flex flex-1 flex-col gap-2 overflow-hidden">
          {msg('user', phase >= 0, USER_TEXT)}
          {phase >= 1 &&
            phase < 2 &&
            msg('ai', true, (
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-0.5 w-0.5 animate-pulse rounded-full bg-ink-faint"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </span>
            ))}
          {msg('ai', phase >= 2, '我先找一些设计灵感', 200)}
          {/* 灵感九宫格：靠左紧凑排列 */}
          <div
            className="grid w-fit grid-cols-3 gap-1.5 transition-all duration-300"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? 'none' : 'translateY(3px)',
              transitionDelay: phase >= 2 ? '300ms' : '0ms',
            }}
          >
            {Array.from({ length: 9 }, (_, i) => tile('h-10 w-10', true, i * 60))}
          </div>
          {msg('ai', phase >= 3, '我找到了一些关于 xxx 的图片', 200)}
          {msg('ai', phase >= 4, '接下来我帮你设计一组视觉设定图', 200)}
          {/* 视觉设定图 3 张（加载进度条走满后画布才出现） */}
          <div
            className="flex gap-1.5 transition-all duration-300"
            style={{
              opacity: phase >= 4 ? 1 : 0,
              transform: phase >= 4 ? 'none' : 'translateY(3px)',
              transitionDelay: phase >= 4 ? '300ms' : '0ms',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1">
                {tile('aspect-[4/3] w-full', true, i * 120)}
                <div className="mt-1 h-[2px] overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/15">
                  <div
                    className="h-full rounded-full bg-ink/40 dark:bg-white/30"
                    style={{
                      width: phase >= 4 ? '100%' : '0%',
                      transition: 'width 1400ms linear 400ms',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 底部输入框（静态装饰，固定在底部） */}
        <div className="mt-2 flex shrink-0 items-center gap-1.5 rounded-md border border-black/[0.08] bg-card px-2 py-1.5 dark:border-white/15">
          <span className="flex-1 truncate text-[10px] text-ink-faint">
            描述你的想法…
          </span>
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink/80 text-page">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 4h6M4.5 1.5 7 4l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
