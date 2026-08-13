import { useEffect, useState } from 'react';

// 表单场景：输入框逐字输入 → 按钮高亮 → 结果出现，循环播放
const FORM_INPUT = 'portfolio.json';
const FORM_RESULT = '已生成 12 个页面 ✓';

export default function FormScene({ input = FORM_INPUT, result = FORM_RESULT, active = true }) {
  const [step, setStep] = useState(0); // 0 输入中 → 1 按钮高亮 → 2 结果
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (!active) {
      setStep(0);
      setTyped(0);
      return;
    }
    if (step !== 0) return;
    setTyped(0);
    const t = setInterval(() => {
      setTyped((n) => {
        if (n >= input.length) {
          clearInterval(t);
          setTimeout(() => setStep(1), 500);
          return n;
        }
        return n + 1;
      });
    }, 60);
    return () => clearInterval(t);
  }, [step, input.length, active]);
  useEffect(() => {
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 800);
      return () => clearTimeout(t);
    }
    if (step === 2) {
      const t = setTimeout(() => setStep(0), 1600);
      return () => clearTimeout(t);
    }
  }, [step]);
  return (
    <div className="flex aspect-[16/9] flex-col justify-center gap-4 p-6">
      {/* 输入框 */}
      <div className="rounded-md border border-black/[0.08] bg-card px-3 py-2 font-mono text-xs text-ink-soft dark:border-white/15">
        {step === 0 ? input.slice(0, typed) : input}
        {step < 2 && (
          <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-ink-faint align-middle" />
        )}
      </div>
      {/* 按钮：执行时反色高亮 */}
      <div
        className={`w-fit rounded-md px-4 py-1.5 text-xs transition-colors duration-200 ${
          step >= 1 ? 'bg-ink text-page' : 'bg-ink/10 text-ink-faint dark:bg-white/10'
        }`}
      >
        生成
      </div>
      {step === 2 && <p className="text-xs text-ink">{result}</p>}
    </div>
  );
}
