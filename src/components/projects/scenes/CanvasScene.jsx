import { useEffect, useRef, useState } from 'react';

// 画布场景：左无限画布 + 右对话 Agent（16:9）
// 对话区流程：用户消息 → AI 找灵感（九宫格）→ 文本 → 视觉设定图（加载）
//   → 右说话骨架 → 左说话骨架+3 分镜图 → 右说话骨架 → 视频骨架 → 播放 → 循环
// 画布区同步：3 视觉参考图 → 3 分镜图 → 1 视频（其余时候为空）
// 后续文字用骨架条（灰条）代替；active=false（预览收起）时暂停并重置，展开后从头播放
// 注意：所有按 phase 显示的内容必须条件渲染（不能用 opacity 占位），否则隐藏元素占位
// 导致对话区内容恒超高、滚动跟随把顶部消息滚出视口
const PHASES = [800, 900, 1600, 1200, 1800, 1400, 1400, 1800, 1400, 1800, 1800]; // 一轮约 16.4s
const USER_TEXT = '帮我制作一个 xxx 视频';

// 文字骨架：一行行灰条模拟文字
const SkeletonLines = ({ widths }) => (
  <div className="space-y-1">
    {widths.map((w, i) => (
      <div key={i} className={`h-1 rounded-full bg-black/[0.1] dark:bg-white/15 ${w}`} />
    ))}
  </div>
);

export default function CanvasScene({ active = true }) {
  const [phase, setPhase] = useState(0);
  const listRef = useRef(null);

  // 相位推进：active=false 时暂停并重置到开头
  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const t = setTimeout(
      () => setPhase((p) => (p + 1) % PHASES.length),
      PHASES[phase]
    );
    return () => clearTimeout(t);
  }, [phase, active]);

  // 内容满了自动平滑滚到底部（顶部消息滚出，新消息滚入）
  useEffect(() => {
    const el = listRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [phase]);

  // 对话气泡：条件渲染（未到时不在 DOM，不占位）+ 淡入上浮动画
  // side: 'user' = 右侧说话（靠右气泡），'ai' = 左侧说话（靠左气泡）
  const msg = (side, show, children, delay = 0) => {
    if (!show) return null;
    return (
      <div
        className="animate-[fade-in-up_0.3s_ease_both]"
        style={{ animationDelay: `${delay}ms` }}
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
  };

  // 灰阶图片占位（无状态，由父级条件渲染控制出现时机；暗色下用白叠加保证可见）
  const tile = (size, label = null, extra = null) => (
    <div
      className={`relative shrink-0 rounded-[4px] border border-black/[0.08] bg-gradient-to-br from-black/[0.03] to-black/[0.07] dark:border-white/20 dark:from-white/[0.08] dark:to-white/[0.14] ${size}`}
    >
      {label && (
        <span className="absolute bottom-0.5 right-1 text-[8px] tabular-nums text-ink-faint">
          {label}
        </span>
      )}
      {extra}
    </div>
  );

  // 条件渲染区块（淡入上浮）
  const block = (show, delay, children) =>
    show ? (
      <div
        className="animate-[fade-in-up_0.3s_ease_both]"
        style={{ animationDelay: `${delay}ms` }}
      >
        {children}
      </div>
    ) : null;

  return (
    <div className="flex aspect-[16/9] max-sm:aspect-[4/3]">
      {/* 左：无限画布（60%）—— 3 视觉参考图 → 3 分镜图 → 1 视频（与对话区同步） */}
      <div className="relative w-[60%] overflow-hidden border-r border-black/[0.06] dark:border-white/10">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-x-0 top-5 flex flex-col gap-3 px-5">
          {/* 3 张视觉参考图（设定图加载完成，画布同时出现） */}
          {block(phase >= 5, 0, (
            <div className="flex w-2/3 gap-2">
              {[1, 2, 3].map((n) => tile('aspect-[4/3] flex-1', String(n).padStart(2, '0')))}
            </div>
          ))}
          {/* 3 个分镜图骨架（与对话区同步出现，横排） */}
          {block(phase >= 7, 200, (
            <div className="flex w-2/3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] flex-1 rounded-[3px] border border-black/[0.08] bg-gradient-to-br from-black/[0.03] to-black/[0.07] dark:border-white/20 dark:from-white/[0.08] dark:to-white/[0.14]"
                />
              ))}
            </div>
          ))}
          {/* 1 个视频骨架（与对话区同步出现，方框中央播放按钮） */}
          {block(phase >= 9, 200, (
            <div className="relative flex h-24 w-2/3 items-center justify-center rounded-[4px] border border-black/[0.1] bg-card dark:border-white/20">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-ink/85 text-page">
                <svg width="9" height="10" viewBox="0 0 8 9" fill="currentColor">
                  <path d="M0 0l8 4.5L0 9z" />
                </svg>
                {phase === 10 && (
                  <span className="absolute inset-0 animate-[ping_0.8s_ease-out_1] rounded-full bg-ink/25" />
                )}
              </div>
              {/* 底部播放进度条 */}
              <div className="absolute inset-x-3 bottom-2 h-[3px] overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/15">
                <div
                  className="h-full rounded-full bg-ink/50 dark:bg-white/40"
                  style={{
                    width: phase >= 10 ? '100%' : '0%',
                    transition: 'width 1600ms linear 400ms',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右：对话区（40%）—— 左右交替说话；内容满了自动平滑滚动 */}
      <div className="flex w-[40%] flex-col p-2">
        <div
          ref={listRef}
          className="flex-1 space-y-1.5 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {msg('user', phase >= 0, USER_TEXT)}
          {msg('ai', phase >= 1 && phase < 2, (
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
          {block(phase >= 2, 300, (
            <div className="grid w-fit grid-cols-3 gap-1">
              {Array.from({ length: 9 }, (_, i) => tile('h-8 w-8'))}
            </div>
          ))}
          {msg('ai', phase >= 3, '我找到了一些关于 xxx 的图片', 200)}
          {msg('ai', phase >= 4, '接下来我帮你设计一组视觉设定图', 200)}
          {/* 视觉设定图 3 张（加载进度条走满后画布才出现） */}
          {block(phase >= 4, 300, (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex-1">
                  {tile('h-10 w-full')}
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
          ))}
          {/* —— 视觉设定图之后：左右交替说话 —— */}
          {/* 右说话：一句话骨架 */}
          {msg('user', phase >= 6, <SkeletonLines widths={['w-3/4']} />, 150)}
          {/* 左说话：一句话骨架 */}
          {msg('ai', phase >= 7, <SkeletonLines widths={['w-2/3']} />, 150)}
          {/* 3 个分镜图（口口口，横排）——与画布同步 */}
          {block(phase >= 7, 350, (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] flex-1 rounded-[3px] border border-black/[0.08] bg-gradient-to-br from-black/[0.03] to-black/[0.07] dark:border-white/20 dark:from-white/[0.08] dark:to-white/[0.14]"
                />
              ))}
            </div>
          ))}
          {/* 右说话：一句话骨架 */}
          {msg('user', phase >= 8, <SkeletonLines widths={['w-1/2']} />, 150)}
          {/* 视频骨架（口，1 个方框中央播放按钮）——与画布同步 */}
          {block(phase >= 9, 200, (
            <div className="relative flex aspect-[16/9] w-full items-center justify-center rounded-[4px] border border-black/[0.1] bg-card dark:border-white/20">
              <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-ink/85 text-page">
                <svg width="7" height="8" viewBox="0 0 8 9" fill="currentColor">
                  <path d="M0 0l8 4.5L0 9z" />
                </svg>
                {phase === 10 && (
                  <span className="absolute inset-0 animate-[ping_0.8s_ease-out_1] rounded-full bg-ink/25" />
                )}
              </div>
            </div>
          ))}
        </div>
        {/* 底部输入框（静态装饰，固定在底部） */}
        <div className="mt-1.5 flex shrink-0 items-center gap-1.5 rounded-md border border-black/[0.08] bg-card px-2 py-1.5 dark:border-white/15">
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
