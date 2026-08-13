import { useEffect, useRef, useState } from 'react';

// 逐字输出的打字机效果；onDone 在全部输出完毕后触发一次。
export default function Typewriter({ text, speed = 26, startDelay = 300, active = true, onDone }) {
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => {
    if (!active) return;
    setCount(0);
    setFinished(false);

    const timers = timersRef.current;
    timers.push(
      setTimeout(() => {
        let i = 0;
        const tick = () => {
          i += 1;
          setCount(i);
          if (i < text.length) {
            timers.push(setTimeout(tick, speed));
          } else {
            setFinished(true);
          }
        };
        timers.push(setTimeout(tick, speed));
      }, startDelay)
    );

    return () => timers.forEach(clearTimeout);
  }, [text, active, speed, startDelay]);

  useEffect(() => {
    if (finished && active) onDone?.();
  }, [finished, active, onDone]);

  return (
    <span className="whitespace-pre-wrap">
      {text.slice(0, count)}
      {!finished && active && <span className="animate-blink text-neutral-400 dark:text-ink-muted">▍</span>}
    </span>
  );
}
