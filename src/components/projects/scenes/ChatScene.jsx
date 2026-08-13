import { useEffect, useState } from 'react';

// 对话场景：用户提问 → AI 思考 → AI 逐字回复，循环播放
const CHAT_Q = '帮我检索相关文档…';
const CHAT_A = '已找到 12 条相关片段，为你整理如下结论…';

export default function ChatScene({ question = CHAT_Q, answer = CHAT_A, active = true }) {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  // step: 0 用户提问 → 1 思考中 → 2 回复打字中 → 3 完成
  useEffect(() => {
    if (!active) {
      setStep(0);
      setTyped(0);
      return;
    }
    if (step !== 2) return;
    setTyped(0);
    const t = setInterval(() => {
      setTyped((n) => {
        if (n >= answer.length) {
          clearInterval(t);
          setTimeout(() => setStep(3), 900);
          return n;
        }
        return n + 1;
      });
    }, 40);
    return () => clearInterval(t);
  }, [step, answer.length, active]);
  useEffect(() => {
    if (!active) return;
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 900);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 1100);
      return () => clearTimeout(t);
    }
    if (step === 3) {
      const t = setTimeout(() => setStep(0), 1400);
      return () => clearTimeout(t);
    }
  }, [step, active]);
  return (
    <div className="flex aspect-[16/9] flex-col justify-end gap-2.5 p-5">
      {/* 用户气泡 */}
      <div className="max-w-[75%] self-end rounded-lg rounded-br-sm bg-ink/10 px-3 py-1.5 text-xs text-ink-soft dark:bg-white/10">
        {question}
      </div>
      {/* AI 气泡 */}
      {step >= 1 && (
        <div className="max-w-[85%] self-start rounded-lg rounded-bl-sm bg-black/[0.04] px-3 py-1.5 text-xs leading-relaxed text-ink-soft dark:bg-white/[0.06]">
          {step === 1 ? (
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 animate-pulse rounded-full bg-ink-faint"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </span>
          ) : (
            answer.slice(0, step === 3 ? answer.length : typed)
          )}
        </div>
      )}
    </div>
  );
}
