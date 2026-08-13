import { useEffect, useState } from 'react';

// 终端场景：16:9 窗口内逐行执行，循环播放
const TERMINAL_LINES = ['正在连接服务…', '正在检索知识库…', '正在生成回复…', '任务完成 ✓'];

export default function TerminalScene({ lines = TERMINAL_LINES, active = true }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const t = setInterval(
      () => setStep((s) => (s + 1) % (lines.length + 1)),
      800
    );
    return () => clearInterval(t);
  }, [lines.length, active]);
  const visible = lines.slice(0, step + 1);
  const progress = (step / lines.length) * 100;
  return (
    <div className="flex aspect-[16/9] flex-col justify-between p-5">
      <div className="space-y-2 font-mono text-xs leading-relaxed text-ink-soft">
        {visible.map((line, i) => (
          <p key={i} className={line.includes('✓') ? 'text-ink' : undefined}>
            {i === visible.length - 1 && !line.includes('✓') && (
              <span className="mr-1 text-ink-faint">$</span>
            )}
            {line}
          </p>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span>{step >= lines.length ? '完成' : '执行中'}</span>
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <div
            className="h-full rounded-full bg-ink/40 transition-all duration-300 dark:bg-white/30"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
