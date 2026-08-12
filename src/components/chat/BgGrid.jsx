import { memo, useEffect, useRef } from 'react';

const GRID = 80; // 网格间距（px），与 Aceternity 原版一致（线从 40px 起、每 80px 一条）
const RADIUS = 110; // 碰撞半径（px）：光标进入该范围，圆点变深（大小不变）
const LINE_BAND = 60; // 线变深的带宽（px）：光标进入某条线 ±60px，整条线变深
const IDLE_MS = 500; // 鼠标停止移动多久后全部回缩
const V_COUNT = 40; // 竖线数（80*40 = 3200px）
const H_COUNT = 30; // 横线数（80*30 = 2400px）

const LINE = '#E4E4E7'; // 线的基础色（Aceternity light 同色）
const LINE_HOT = '#9B9BA3'; // 线被光标靠近时的深色
const DOT = '#D6D6DB'; // 圆点基础色
const DOT_HOT = '#7F7F88'; // 圆点碰撞时的深色

// 圆点坐标：从半格 40px 起，与横竖线交点对齐
function buildDots() {
  const dots = [];
  for (let i = 0; i < V_COUNT; i++) {
    for (let j = 0; j < H_COUNT; j++) {
      dots.push({ x: GRID / 2 + i * GRID, y: GRID / 2 + j * GRID });
    }
  }
  return dots;
}
const DOTS = buildDots();

// 首页网格背景（复刻 Aceternity「background-grid-with-dots-and-animations」）：
// SVG 画 80px 网格线 + 交点圆点，容器径向 mask 中心渐隐。
// 交互（圆点大小保持不变，只变颜色）：
//   线 —— 光标靠近某条线（±LINE_BAND）时整条线变深（颜色变化）
//   圆点 —— 光标碰撞（进入 RADIUS）时圆点变深，离开回缩
function BgGrid() {
  const vRefs = useRef([]); // 竖线
  const hRefs = useRef([]); // 横线
  const dotRefs = useRef([]);
  const lastV = useRef([]); // 竖线当前 stroke（只写变化的，省性能）
  const lastH = useRef([]); // 横线当前 stroke
  const lastHot = useRef([]); // 圆点是否处于碰撞热区
  const rafRef = useRef(0);
  const idleRef = useRef(null);

  useEffect(() => {
    const reset = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      vRefs.current.forEach((el) => {
        if (el) el.style.stroke = LINE;
      });
      hRefs.current.forEach((el) => {
        if (el) el.style.stroke = LINE;
      });
      dotRefs.current.forEach((el) => {
        if (el) el.style.fill = DOT;
      });
      lastV.current = [];
      lastH.current = [];
      lastHot.current = [];
    };
    const onMove = (e) => {
      // 每次移动都重置空闲计时：停止移动 / 离开窗口后全部回缩，避免残留
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(reset, IDLE_MS);
      if (rafRef.current) return;
      const mx = e.clientX;
      const my = e.clientY;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        // 竖线：光标靠近则整条变深
        for (let i = 0; i < V_COUNT; i++) {
          const el = vRefs.current[i];
          if (!el) continue;
          const stroke =
            Math.abs(GRID / 2 + i * GRID - mx) <= LINE_BAND ? LINE_HOT : LINE;
          if (lastV.current[i] !== stroke) {
            lastV.current[i] = stroke;
            el.style.stroke = stroke;
          }
        }
        // 横线：光标靠近则整条变深
        for (let j = 0; j < H_COUNT; j++) {
          const el = hRefs.current[j];
          if (!el) continue;
          const stroke =
            Math.abs(GRID / 2 + j * GRID - my) <= LINE_BAND ? LINE_HOT : LINE;
          if (lastH.current[j] !== stroke) {
            lastH.current[j] = stroke;
            el.style.stroke = stroke;
          }
        }
        // 圆点：碰撞 → 变深（大小不变）
        for (let k = 0; k < DOTS.length; k++) {
          const el = dotRefs.current[k];
          if (!el) continue;
          const dx = DOTS[k].x - mx;
          const dy = DOTS[k].y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          const t = Math.max(0, 1 - d / RADIUS);
          const hot = t > 0.05;
          if (lastHot.current[k] !== hot) {
            lastHot.current[k] = hot;
            el.style.fill = hot ? DOT_HOT : DOT;
          }
        }
      });
    };
    // 鼠标离开窗口 / 窗口失焦：立即全部回缩
    const onLeave = () => {
      clearTimeout(idleRef.current);
      reset();
    };
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      clearTimeout(idleRef.current);
      reset();
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <div className="bg-grid-mask pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full">
        {/* 横线 */}
        {Array.from({ length: H_COUNT }, (_, j) => (
          <line
            key={`h${j}`}
            ref={(el) => {
              hRefs.current[j] = el;
            }}
            data-h={j}
            x1="0"
            y1={GRID / 2 + j * GRID}
            x2="100%"
            y2={GRID / 2 + j * GRID}
            stroke={LINE}
            strokeWidth="1"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        ))}
        {/* 竖线 */}
        {Array.from({ length: V_COUNT }, (_, i) => (
          <line
            key={`v${i}`}
            ref={(el) => {
              vRefs.current[i] = el;
            }}
            data-v={i}
            x1={GRID / 2 + i * GRID}
            y1="0"
            x2={GRID / 2 + i * GRID}
            y2="100%"
            stroke={LINE}
            strokeWidth="1"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        ))}
        {/* 交点圆点（碰撞：只变深，大小不变） */}
        {DOTS.map((p, k) => (
          <circle
            key={k}
            ref={(el) => {
              dotRefs.current[k] = el;
            }}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill={DOT}
            style={{ transition: 'fill 0.3s ease' }}
          />
        ))}
      </svg>
    </div>
  );
}

// 组件无 props 且只有 refs，用 memo 保证只渲染一次（聊天流式更新时不被反复重渲染）
export default memo(BgGrid);
