import { useEffect, useRef } from 'react';

const GRID = 56; // 网格间距（px），必须与 .bg-grid 的 background-size 一致
const TRIGGER = 20; // 触发范围半径（px）：鼠标移动轨迹贴近某条线（20px 内）即触发
const V_COUNT = 40; // 最多渲染的竖线数（56*40 = 2240px，覆盖常见视口）
const H_COUNT = 30; // 最多渲染的横线数（56*30 = 1680px）

// 首页科技感网格：基础网格（线 + 交点圆点）在 CSS 里；这里额外渲染一层高亮线。
// 鼠标移动时按"整段轨迹"插值判断：只要这次移动的路径经过某条线 TRIGGER 范围内，
// 整条线就变深并轻微"拨动"——快速移动也不会漏触发（鼠标事件是跳跃采样的，
// 只用落点判断会跳过窄带，必须看轨迹）。
export default function BgGrid() {
  const vRefs = useRef([]);
  const hRefs = useRef([]);
  const rafRef = useRef(0);
  const prevRef = useRef(null); // 上一次处理的鼠标位置（用于轨迹插值）

  useEffect(() => {
    const onMove = (e) => {
      if (rafRef.current) return;
      const mx = e.clientX;
      const my = e.clientY;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        let px = prevRef.current?.x ?? mx;
        let py = prevRef.current?.y ?? my;
        prevRef.current = { x: mx, y: my };
        // 跳变（离开窗口后重新进入等）：不做插值，避免整屏误触发
        if (Math.abs(mx - px) > 300 || Math.abs(my - py) > 300) {
          px = mx;
          py = my;
        }
        const xmin = Math.min(px, mx);
        const xmax = Math.max(px, mx);
        const ymin = Math.min(py, my);
        const ymax = Math.max(py, my);
        vRefs.current.forEach((el, i) => {
          if (!el) return;
          const xi = (i + 1) * GRID;
          const dx =
            xmin <= xi && xi <= xmax
              ? 0
              : Math.min(Math.abs(xi - xmin), Math.abs(xi - xmax));
          const on = dx <= TRIGGER;
          if (on && el.style.opacity !== '1') {
            el.style.opacity = '1';
            // 重新触发"拨动"动画（必须清空并强制回流才能重放）
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = 'line-nudge-v 0.4s ease-out';
          } else if (!on && el.style.opacity !== '0') {
            el.style.opacity = '0';
          }
        });
        hRefs.current.forEach((el, i) => {
          if (!el) return;
          const yi = (i + 1) * GRID;
          const dy =
            ymin <= yi && yi <= ymax
              ? 0
              : Math.min(Math.abs(yi - ymin), Math.abs(yi - ymax));
          const on = dy <= TRIGGER;
          if (on && el.style.opacity !== '1') {
            el.style.opacity = '1';
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = 'line-nudge-h 0.4s ease-out';
          } else if (!on && el.style.opacity !== '0') {
            el.style.opacity = '0';
          }
        });
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* 基础网格：线 + 交点圆点，边缘渐隐 */}
      <div className="bg-grid absolute inset-0" />
      {/* 高亮线：鼠标触发范围内的整条线变深 */}
      {Array.from({ length: V_COUNT }, (_, i) => (
        <div
          key={`v${i}`}
          ref={(el) => {
            vRefs.current[i] = el;
          }}
          className="absolute top-0 h-full w-px bg-ink/15"
          style={{ left: (i + 1) * GRID, opacity: 0, transition: 'opacity 0.3s ease' }}
        />
      ))}
      {Array.from({ length: H_COUNT }, (_, i) => (
        <div
          key={`h${i}`}
          ref={(el) => {
            hRefs.current[i] = el;
          }}
          className="absolute left-0 h-px w-full bg-ink/15"
          style={{ top: (i + 1) * GRID, opacity: 0, transition: 'opacity 0.3s ease' }}
        />
      ))}
    </div>
  );
}
