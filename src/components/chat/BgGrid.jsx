import { useEffect, useRef } from 'react';

const GRID = 56; // 网格间距（px），必须与 .bg-grid 的 background-size 一致
const TRIGGER = 80; // 触发范围半径（px）：鼠标进入某条线附近这个范围，整条线变深
const V_COUNT = 40; // 最多渲染的竖线数（56*40 = 2240px，覆盖常见视口）
const H_COUNT = 30; // 最多渲染的横线数（56*30 = 1680px）

// 首页科技感网格：基础网格（线 + 交点圆点）在 CSS 里；这里额外渲染一层高亮线，
// 鼠标移动到某条线附近的触发范围内时，把这条整线变深（不是圆形渐隐，也不是精准对线）。
export default function BgGrid() {
  const vRefs = useRef([]);
  const hRefs = useRef([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const onMove = (e) => {
      if (rafRef.current) return;
      const mx = e.clientX;
      const my = e.clientY;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        vRefs.current.forEach((el, i) => {
          if (!el) return;
          el.style.opacity = Math.abs((i + 1) * GRID - mx) <= TRIGGER ? '1' : '0';
        });
        hRefs.current.forEach((el, i) => {
          if (!el) return;
          el.style.opacity = Math.abs((i + 1) * GRID - my) <= TRIGGER ? '1' : '0';
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
          style={{ left: (i + 1) * GRID, opacity: 0 }}
        />
      ))}
      {Array.from({ length: H_COUNT }, (_, i) => (
        <div
          key={`h${i}`}
          ref={(el) => {
            hRefs.current[i] = el;
          }}
          className="absolute left-0 h-px w-full bg-ink/15"
          style={{ top: (i + 1) * GRID, opacity: 0 }}
        />
      ))}
    </div>
  );
}
