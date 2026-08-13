import { useEffect, useState } from 'react';

// 列表场景：模块逐个加载，最新一个高亮，循环播放
const LIST_MODULES = ['app-shell', 'remote-a', 'remote-b', 'shared-utils'];

export default function ListScene({ modules = LIST_MODULES, active = true }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const t = setInterval(
      () => setStep((s) => (s + 1) % (modules.length + 1)),
      650
    );
    return () => clearInterval(t);
  }, [modules.length, active]);
  return (
    <div className="flex aspect-[16/9] flex-col justify-center gap-2 p-6">
      {modules.slice(0, step + 1).map((m, i) => (
        <div
          key={m}
          className={`flex items-center justify-between rounded-md border px-3 py-2 font-mono text-xs transition-colors duration-200 ${
            i === step
              ? 'border-black/[0.14] text-ink dark:border-white/25'
              : 'border-black/[0.06] text-ink-faint dark:border-white/10'
          }`}
        >
          <span>{m}</span>
          <span className="tabular-nums">{i === step ? '加载中…' : '✓'}</span>
        </div>
      ))}
    </div>
  );
}
