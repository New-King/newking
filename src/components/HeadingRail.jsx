import { useEffect, useState } from 'react';

const BAR_H = 2; // 条高（px）
const PAD = 8; // 条区内边距
const BASE_LEN = 10; // h2 常态条长
const H3_BASE_LEN = 7; // h3 常态条长（缩进 + 更短，体现层级）
const MAX_LEN = 46; // 悬停焦点条长
const DECAY = 0.55; // 向两侧递减系数，形成钟形曲线
const MIN_GAP = 5; // 条间距下限
const MAX_GAP = 13; // 条间距上限
const PANEL_W = 260; // 预览面板宽度
const PANEL_H = 140; // 预览面板估算高度（仅用于限制面板不超出视口）
const H3_INDENT = 6; // h3 条缩进
const RAIL_TOP = 168; // 条区距视口顶部的固定距离（对齐标题下方）

// 钟形递减：焦点最长，向两侧按系数平滑缩短
const lenFor = (base, d) => Math.round(base + (MAX_LEN - base) * Math.pow(DECAY, d));

/**
 * 文章详情左侧定位条：每条横杠对应一个 h2/h3。
 * 悬停条区时焦点条变长，右侧浮出该节预览（标题 + 摘要），点击跳转；
 * 不悬停时用加深的条标出当前阅读位置。
 */
export default function HeadingRail({ headings }) {
  const [hover, setHover] = useState(null);
  const [active, setActive] = useState(0);
  const [viewportH, setViewportH] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight
  );

  // 视口高度变化时重算条间距，保证整根定位条不超出视口
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const count = headings.length;
  const maxRailH = Math.min(viewportH * 0.62, 560);
  const gap =
    count > 1
      ? Math.max(MIN_GAP, Math.min(MAX_GAP, (maxRailH - count * BAR_H) / (count - 1)))
      : MAX_GAP;
  const step = BAR_H + gap;
  const railH = count * BAR_H + (count - 1) * gap;
  const wrapH = railH + PAD * 2;

  // 固定距顶 168px；视口太矮时下压，避免整根条超出底部
  const railTop = Math.min(RAIL_TOP, Math.max(16, viewportH - wrapH - 12));

  // 滚动位置 → 当前所在小节（最后一个越过注视线的标题）
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let next = 0;
      headings.forEach((heading, i) => {
        const el = document.getElementById(heading.id);
        if (el && el.getBoundingClientRect().top <= 120) next = i;
      });
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [headings]);

  if (count === 0) return null;

  // 由鼠标在条区内的 Y 计算焦点条（最近邻）
  const indexAt = (rawY) =>
    Math.max(0, Math.min(count - 1, Math.round((rawY - PAD - BAR_H / 2) / step)));

  return (
    <div className="fixed inset-y-0 left-[276px] z-40 hidden xl:block">
      <div
        className="absolute left-0"
        style={{ top: railTop, width: PAD * 2 + MAX_LEN, height: wrapH }}
        onMouseLeave={() => setHover(null)}
      >
        {/* 条区：悬停激活区；离开即隐藏预览 */}
        <div
          className="absolute inset-0 cursor-pointer"
          onMouseEnter={(e) => {
            const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
            setHover(indexAt(rawY));
          }}
          onMouseMove={(e) => {
            if (hover === null) return;
            const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
            const next = indexAt(rawY);
            setHover((prev) => (prev === next ? prev : next));
          }}
          onMouseLeave={() => setHover(null)}
          onClick={() => {
            if (hover === null) return;
            document
              .getElementById(headings[hover].id)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActive(hover);
          }}
        >
          <div className="absolute flex flex-col items-start" style={{ left: PAD, top: PAD, gap }}>
            {headings.map((heading, i) => {
              const d = hover === null ? -1 : Math.abs(i - hover);
              const isFocus = hover !== null && d === 0;
              const isActive = i === active;
              const base = heading.level === 3 ? H3_BASE_LEN : BASE_LEN;
              const width =
                hover === null ? (isActive ? MAX_LEN * 0.55 : base) : lenFor(base, d);
              return (
                <button
                  key={heading.id}
                  type="button"
                  aria-label={`跳转到小节：${heading.text}`}
                  aria-current={isActive ? 'true' : undefined}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover((prev) => (prev === i ? null : prev))}
                  style={{
                    width: `${width}px`,
                    marginLeft: heading.level === 3 ? H3_INDENT : 0,
                  }}
                  className={`h-[2px] cursor-pointer rounded-full transition-all duration-300 ease-smooth motion-reduce:transition-none ${
                    isFocus || isActive
                      ? 'bg-accent dark:bg-white'
                      : 'bg-ink-faint/40 dark:bg-white/25'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 预览面板：纯展示，垂直居中于焦点条。
          放在无 transform 的外层，fixed 坐标才能以视口为基准。 */}
      {hover !== null && headings[hover] && (
        <div
          className="pointer-events-none fixed surface-chat rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/[0.06]"
          style={{
            width: PANEL_W,
            left: 276 + PAD + MAX_LEN + 8,
            top: `clamp(${PANEL_H / 2 + 12}px, ${
              railTop + PAD + hover * step + BAR_H / 2
            }px, calc(100dvh - ${PANEL_H / 2 + 12}px))`,
            transform: 'translateY(-50%)',
          }}
        >
          <p className="line-clamp-2 text-[13px] font-medium leading-5 text-ink">
            {headings[hover].text}
          </p>
          {headings[hover].excerpt && (
            <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-ink-soft">
              {headings[hover].excerpt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
