import { useEffect, useState } from 'react';

// 快传场景：先发件（上传 → 取件码）→ 过渡到取件（输码 → 文件），循环播放
const DEFAULT_CODE = ['A', '3', '7', '2', 'K'];
const DEFAULT_FILE = 'design-spec.pdf';
const DEFAULT_SIZE = '2.4 MB';
const SEND_PHASES = 4; // 0 上传区 → 1 选中文件 → 2 发送高亮 → 3 取件码
const RETRIEVE_START = 4;
const RETRIEVE_RESULT = RETRIEVE_START + DEFAULT_CODE.length; // 9
const RESET_PHASE = RETRIEVE_RESULT + 1; // 10

function CodeSlot({ char, active }) {
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-md border font-mono text-xs tabular-nums transition-colors duration-200 sm:h-9 sm:w-9 sm:text-sm ${
        char
          ? 'border-black/[0.14] bg-card text-ink dark:border-white/25'
          : active
            ? 'border-black/[0.18] bg-card text-ink dark:border-white/30'
            : 'border-black/[0.08] bg-black/[0.02] text-ink-faint dark:border-white/10 dark:bg-white/[0.03]'
      }`}
    >
      {char || (active ? <span className="h-3 w-px animate-pulse bg-ink-faint" /> : '')}
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m21.854 2.147-10.94 10.939" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RetrieveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 13v8" strokeLinecap="round" />
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8 17 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendPanel({ phase, file, code }) {
  const codeText = code.join('');
  const showFile = phase >= 1;
  const buttonActive = phase >= 2;
  const showCode = phase >= 3;

  return (
    <>
      <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-black/[0.03] text-ink-soft dark:border-white/12 dark:bg-white/[0.06] sm:mb-3 sm:h-10 sm:w-10">
        <SendIcon />
      </div>
      <p className="text-center text-[13px] font-medium text-ink">发送文件</p>
      <p className="mt-1 text-center text-[10px] text-ink-faint">拖拽或点击上传</p>

      <div
        className={`mt-3 rounded-lg border border-dashed px-3 py-4 transition-colors duration-300 sm:mt-4 sm:py-5 ${
          showFile
            ? 'border-black/[0.14] bg-page dark:border-white/20'
            : 'border-black/[0.1] bg-black/[0.02] dark:border-white/12 dark:bg-white/[0.03]'
        }`}
      >
        {showFile ? (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-black/[0.08] bg-card dark:border-white/12">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="truncate font-mono text-[10px] text-ink sm:text-[11px]">{file}</p>
          </div>
        ) : (
          <p className="text-center text-[10px] text-ink-faint">选择文件…</p>
        )}
      </div>

      <div
        className={`mt-3 w-full rounded-md py-1.5 text-center text-[11px] transition-colors duration-200 sm:mt-3.5 ${
          buttonActive ? 'bg-ink text-page' : 'bg-ink/10 text-ink-faint dark:bg-white/10'
        }`}
      >
        发送
      </div>

      <div
        className={`mt-3 overflow-hidden transition-all duration-300 ${
          showCode ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="rounded-md border border-black/[0.08] bg-page px-3 py-2 text-center dark:border-white/10">
          <p className="text-[10px] text-ink-faint">取件码</p>
          <p className="mt-0.5 font-mono text-sm tracking-[0.2em] text-ink">{codeText}</p>
        </div>
      </div>
    </>
  );
}

function RetrievePanel({ retrieveStep, code, file, size }) {
  const filled = code.map((digit, i) => (i < retrieveStep ? digit : ''));
  const showResult = retrieveStep >= code.length;

  return (
    <>
      <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-black/[0.03] text-ink-soft dark:border-white/12 dark:bg-white/[0.06] sm:mb-3 sm:h-10 sm:w-10">
        <RetrieveIcon />
      </div>
      <p className="text-center text-[13px] font-medium text-ink">提取文件</p>
      <p className="mt-1 text-center text-[10px] text-ink-faint">输入 5 位取件码</p>

      <div className="mt-3 flex justify-center gap-1.5 sm:mt-4 sm:gap-2">
        {filled.map((digit, i) => (
          <CodeSlot key={i} char={digit} active={retrieveStep === i} />
        ))}
      </div>

      <div
        className={`mt-3 overflow-hidden transition-all duration-300 sm:mt-4 ${
          showResult ? 'max-h-14 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between rounded-md border border-black/[0.08] bg-page px-3 py-2 dark:border-white/10">
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] text-ink">{file}</p>
            <p className="mt-0.5 text-[10px] text-ink-faint">{size}</p>
          </div>
          <span className="shrink-0 text-[11px] text-ink">✓</span>
        </div>
      </div>
    </>
  );
}

function phaseDelay(phase, codeLength) {
  if (phase < SEND_PHASES) {
    if (phase === 3) return 1400;
    return 650;
  }
  if (phase < RETRIEVE_START + codeLength) return 420;
  if (phase === RETRIEVE_RESULT) return 1800;
  return 500;
}

export default function TransferScene({
  code = DEFAULT_CODE,
  file = DEFAULT_FILE,
  size = DEFAULT_SIZE,
  active = true,
}) {
  const [phase, setPhase] = useState(0);
  const isSend = phase < SEND_PHASES;
  const retrieveStep = Math.max(0, Math.min(code.length, phase - RETRIEVE_START));

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const t = setTimeout(() => {
      setPhase((p) => (p >= RESET_PHASE ? 0 : p + 1));
    }, phaseDelay(phase, code.length));
    return () => clearTimeout(t);
  }, [phase, code.length, active]);

  return (
    <div className="flex aspect-[16/9] items-center justify-center p-5 sm:p-8">
      <div className="relative w-full max-w-[280px] sm:max-w-[300px]">
        <div
          className={`rounded-2xl border border-black/[0.08] bg-card px-5 py-5 shadow-apple transition-all duration-500 dark:border-white/10 sm:px-6 sm:py-6 ${
            isSend ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
          }`}
        >
          <SendPanel phase={phase} file={file} code={code} />
        </div>
        <div
          className={`rounded-2xl border border-black/[0.08] bg-card px-5 py-5 shadow-apple transition-all duration-500 dark:border-white/10 sm:px-6 sm:py-6 ${
            isSend ? 'pointer-events-none absolute inset-0 opacity-0' : 'opacity-100'
          }`}
        >
          <RetrievePanel retrieveStep={retrieveStep} code={code} file={file} size={size} />
        </div>
      </div>
    </div>
  );
}
