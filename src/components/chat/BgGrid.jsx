import { memo, useEffect, useRef } from 'react';

const GRID = 80; // 网格间距（px），与 Aceternity 原版一致（线从 40px 起、每 80px 一条）
const RADIUS = 110; // 碰撞半径（px）：光标进入该范围，圆点变深（大小不变）
const LINE_BAND = 60; // 线变深的带宽（px）：光标进入某条线 ±60px，该线开始变深
const GROW_MS = 1000; // 变深"进度条"延伸时长（ms），放慢以便清晰看到从光标处延伸
const SLIDE_MS = 600; // 鼠标移开时深色段"往两边移开"滑出屏幕的时长（ms）
const IDLE_MS = 3000; // 鼠标停止移动多久后回缩（加长：悬停时线保持变深，打字等长时间无操作才复位）
const V_COUNT = 40; // 竖线数（80*40 = 3200px）
const H_COUNT = 30; // 横线数（80*30 = 2400px）

const LINE = '#E4E4E7'; // 线的基础色（Aceternity light 同色）
const LINE_HOT = '#9B9BA3'; // 线变深后的颜色
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
// 交互：
//   线 —— 光标进入某条线 ±LINE_BAND 时，该线从光标位置向两端"进度条"式变深
//        （竖线向上下、横线向左右，即从触发点向四周延伸）
//   圆点 —— 光标碰撞（进入 RADIUS）时变深（大小不变）
function BgGrid() {
  const vRefs = useRef([]); // 竖线（基础浅色）
  const hRefs = useRef([]); // 横线（基础浅色）
  const vUpRefs = useRef([]); // 竖线上半段深色覆盖线
  const vDownRefs = useRef([]); // 竖线下半段深色覆盖线
  const hLeftRefs = useRef([]); // 横线左半段深色覆盖线
  const hRightRefs = useRef([]); // 横线右半段深色覆盖线
  const dotRefs = useRef([]);
  const lastBandV = useRef(new Array(V_COUNT).fill(false)); // 竖线是否处于带宽（初始化 false，避免首帧误触发滑出动画）
  const lastBandH = useRef(new Array(H_COUNT).fill(false)); // 横线是否处于带宽
  const lastCyV = useRef([]); // 竖线进入带宽时的光标 y（回缩时按此折叠回触发点）
  const lastCyH = useRef([]); // 横线进入带宽时的光标 x
  const lastHot = useRef([]); // 圆点是否处于碰撞热区
  const prevRangeRef = useRef(null); // 上一帧处理过的圆点范围（用于离开热区的点复位）
  const sizeRef = useRef({ w: 0, h: 0 }); // 视口尺寸（覆盖线 dash 长度依赖）
  const pauseRef = useRef(false); // 鼠标在输入框内：暂停所有网格动画
  const rafRef = useRef(0);
  const idleRef = useRef(null);

  useEffect(() => {
    const updateSize = () => {
      sizeRef.current = { w: window.innerWidth, h: window.innerHeight };
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const reset = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      const { h, w } = sizeRef.current;
      // 覆盖线全部收拢为不可见
      vUpRefs.current.forEach((el) => {
        if (el) {
          el.style.strokeDasharray = `0 ${h}`;
          el.style.strokeDashoffset = '0';
        }
      });
      vDownRefs.current.forEach((el) => {
        if (el) {
          el.style.strokeDasharray = `0 ${h}`;
          el.style.strokeDashoffset = '0';
        }
      });
      hLeftRefs.current.forEach((el) => {
        if (el) {
          el.style.strokeDasharray = `0 ${w}`;
          el.style.strokeDashoffset = '0';
        }
      });
      hRightRefs.current.forEach((el) => {
        if (el) {
          el.style.strokeDasharray = `0 ${w}`;
          el.style.strokeDashoffset = '0';
        }
      });
      dotRefs.current.forEach((el) => {
        if (el) el.style.fill = DOT;
      });
      lastBandV.current = new Array(V_COUNT).fill(false);
      lastBandH.current = new Array(H_COUNT).fill(false);
      lastCyV.current = [];
      lastCyH.current = [];
      lastHot.current = [];
      prevRangeRef.current = null;
    };

    // 两步法过渡：先把元素设到"起点"（transition none + 强制回流），
    // 再设"终点"并开启过渡 —— 保证动画从起点开始（否则会从初始状态插值，方向错误）。
    // 覆盖线的深色段从 pivot（光标投影点）向两端延伸：
    //   上/左段起点 (dash 0, offset -pivot) → 终点 (dash pivot, offset 0)
    //   下/右段起点 (dash 0, offset -pivot) → 终点 (dash total-pivot, offset -pivot)
    const animateTo = (el, fromDash, fromOffset, toDash, toOffset, ms) => {
      el.style.transition = 'none';
      el.style.strokeDasharray = fromDash;
      el.style.strokeDashoffset = fromOffset;
      void el.getBoundingClientRect(); // 强制回流
      el.style.transition = `stroke-dasharray ${ms}ms ease, stroke-dashoffset ${ms}ms ease`;
      el.style.strokeDasharray = toDash;
      el.style.strokeDashoffset = toOffset;
    };

    const onMove = (e) => {
      // 每次移动都重置空闲计时：停止移动 / 离开窗口后全部回缩，避免残留
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(reset, IDLE_MS);
      if (rafRef.current) return;
      if (pauseRef.current) return; // 鼠标在输入框内：不触发任何动画
      const mx = e.clientX;
      const my = e.clientY;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const { w, h } = sizeRef.current;
        // 竖线：进入带宽时，深色从光标处（cy）向上下两端"进度条"式延伸
        for (let i = 0; i < V_COUNT; i++) {
          const inBand = Math.abs(GRID / 2 + i * GRID - mx) <= LINE_BAND;
          if (inBand === lastBandV.current[i]) continue;
          lastBandV.current[i] = inBand;
          const up = vUpRefs.current[i];
          const down = vDownRefs.current[i];
          if (!up || !down) continue;
          if (inBand) {
            const cy = Math.max(0, Math.min(h, my));
            lastCyV.current[i] = cy;
            // 上段 [0, cy)：从 cy 向上延伸；下段 [cy, h)：从 cy 向下延伸
            animateTo(up, `0 ${h}`, `-${cy}`, `${cy} ${h}`, '0', GROW_MS);
            animateTo(down, `0 ${h}`, `-${cy}`, `${h - cy} ${h}`, `-${cy}`, GROW_MS);
          } else {
            // 鼠标移开：深色段在光标处"断裂"，往两边滑出屏幕（上段滑出顶部、下段滑出底部）
            const cy = lastCyV.current[i] ?? h / 2;
            const t = `stroke-dasharray ${SLIDE_MS}ms ease, stroke-dashoffset ${SLIDE_MS}ms ease`;
            // 上段 [0, cy]：offset 0 → cy，整段滑出顶部
            up.style.transition = t;
            up.style.strokeDasharray = `${cy} ${h}`;
            up.style.strokeDashoffset = `${cy}`;
            // 下段 [cy, h]：offset -cy → -h，整段滑出底部
            down.style.transition = t;
            down.style.strokeDasharray = `${h - cy} ${h}`;
            down.style.strokeDashoffset = `-${h}`;
          }
        }
        // 横线：进入带宽时，深色从光标处（cx）向左右两端"进度条"式延伸
        for (let j = 0; j < H_COUNT; j++) {
          const inBand = Math.abs(GRID / 2 + j * GRID - my) <= LINE_BAND;
          if (inBand === lastBandH.current[j]) continue;
          lastBandH.current[j] = inBand;
          const left = hLeftRefs.current[j];
          const right = hRightRefs.current[j];
          if (!left || !right) continue;
          if (inBand) {
            const cx = Math.max(0, Math.min(w, mx));
            lastCyH.current[j] = cx;
            // 左段 [0, cx)：从 cx 向左延伸；右段 [cx, w)：从 cx 向右延伸
            animateTo(left, `0 ${w}`, `-${cx}`, `${cx} ${w}`, '0', GROW_MS);
            animateTo(right, `0 ${w}`, `-${cx}`, `${w - cx} ${w}`, `-${cx}`, GROW_MS);
          } else {
            // 鼠标移开：深色段在光标处"断裂"，往两边滑出屏幕（左段滑出左端、右段滑出右端）
            const cx = lastCyH.current[j] ?? w / 2;
            const t = `stroke-dasharray ${SLIDE_MS}ms ease, stroke-dashoffset ${SLIDE_MS}ms ease`;
            // 左段 [0, cx]：offset 0 → cx，整段滑出左端
            left.style.transition = t;
            left.style.strokeDasharray = `${cx} ${w}`;
            left.style.strokeDashoffset = `${cx}`;
            // 右段 [cx, w]：offset -cx → -w，整段滑出右端
            right.style.transition = t;
            right.style.strokeDasharray = `${w - cx} ${w}`;
            right.style.strokeDashoffset = `-${w}`;
          }
        }
        // 圆点：碰撞 → 变深（大小不变）。
        // 空间裁剪：只检查光标 ±RADIUS 范围内的圆点（约十几个），避免每帧遍历全部 1200 个；
        // 用「上一帧范围 ∪ 当前范围」处理离开热区的点复位。
        const i0 = Math.max(0, Math.ceil((mx - RADIUS - GRID / 2) / GRID));
        const i1 = Math.min(V_COUNT - 1, Math.floor((mx + RADIUS - GRID / 2) / GRID));
        const j0 = Math.max(0, Math.ceil((my - RADIUS - GRID / 2) / GRID));
        const j1 = Math.min(H_COUNT - 1, Math.floor((my + RADIUS - GRID / 2) / GRID));
        const prev = prevRangeRef.current;
        const ui0 = prev ? Math.min(prev.i0, i0) : i0;
        const ui1 = prev ? Math.max(prev.i1, i1) : i1;
        const uj0 = prev ? Math.min(prev.j0, j0) : j0;
        const uj1 = prev ? Math.max(prev.j1, j1) : j1;
        prevRangeRef.current = { i0, i1, j0, j1 };
        for (let i = ui0; i <= ui1; i++) {
          for (let j = uj0; j <= uj1; j++) {
            const k = i * H_COUNT + j;
            const el = dotRefs.current[k];
            if (!el) continue;
            const x = GRID / 2 + i * GRID;
            const y = GRID / 2 + j * GRID;
            const dx = x - mx;
            const dy = y - my;
            const d = Math.sqrt(dx * dx + dy * dy);
            const hot = d <= RADIUS;
            if (lastHot.current[k] !== hot) {
              lastHot.current[k] = hot;
              el.style.fill = hot ? DOT_HOT : DOT;
            }
          }
        }
      });
    };
    // 鼠标离开窗口 / 窗口失焦：立即全部回缩
    const onLeave = () => {
      clearTimeout(idleRef.current);
      reset();
    };
    // 鼠标在输入框内：暂停所有网格动画（进入时立即复位）
    const onPause = (e) => {
      pauseRef.current = !!e.detail?.paused;
      if (pauseRef.current) reset();
    };
    window.addEventListener('bg-grid-pause', onPause);
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      clearTimeout(idleRef.current);
      reset();
      window.removeEventListener('bg-grid-pause', onPause);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <div className="bg-grid-mask pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full">
        {/* 横线：基础浅色 + 左右两段深色覆盖线 */}
        {Array.from({ length: H_COUNT }, (_, j) => (
          <g key={`hg${j}`}>
            <line
              data-h={j}
              x1="0"
              y1={GRID / 2 + j * GRID}
              x2="100%"
              y2={GRID / 2 + j * GRID}
              stroke={LINE}
              strokeWidth="1"
            />
            <line
              ref={(el) => {
                hLeftRefs.current[j] = el;
              }}
              x1="0"
              y1={GRID / 2 + j * GRID}
              x2="100%"
              y2={GRID / 2 + j * GRID}
              stroke={LINE_HOT}
              strokeWidth="1"
              style={{
                strokeDasharray: '0 2000',
                transition: `stroke-dasharray ${GROW_MS}ms ease, stroke-dashoffset ${GROW_MS}ms ease`,
              }}
            />
            <line
              ref={(el) => {
                hRightRefs.current[j] = el;
              }}
              x1="0"
              y1={GRID / 2 + j * GRID}
              x2="100%"
              y2={GRID / 2 + j * GRID}
              stroke={LINE_HOT}
              strokeWidth="1"
              style={{
                strokeDasharray: '0 2000',
                transition: `stroke-dasharray ${GROW_MS}ms ease, stroke-dashoffset ${GROW_MS}ms ease`,
              }}
            />
          </g>
        ))}
        {/* 竖线：基础浅色 + 上下两段深色覆盖线 */}
        {Array.from({ length: V_COUNT }, (_, i) => (
          <g key={`vg${i}`}>
            <line
              data-v={i}
              x1={GRID / 2 + i * GRID}
              y1="0"
              x2={GRID / 2 + i * GRID}
              y2="100%"
              stroke={LINE}
              strokeWidth="1"
            />
            <line
              ref={(el) => {
                vUpRefs.current[i] = el;
              }}
              x1={GRID / 2 + i * GRID}
              y1="0"
              x2={GRID / 2 + i * GRID}
              y2="100%"
              stroke={LINE_HOT}
              strokeWidth="1"
              style={{
                strokeDasharray: '0 2000',
                transition: `stroke-dasharray ${GROW_MS}ms ease, stroke-dashoffset ${GROW_MS}ms ease`,
              }}
            />
            <line
              ref={(el) => {
                vDownRefs.current[i] = el;
              }}
              x1={GRID / 2 + i * GRID}
              y1="0"
              x2={GRID / 2 + i * GRID}
              y2="100%"
              stroke={LINE_HOT}
              strokeWidth="1"
              style={{
                strokeDasharray: '0 2000',
                transition: `stroke-dasharray ${GROW_MS}ms ease, stroke-dashoffset ${GROW_MS}ms ease`,
              }}
            />
          </g>
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
