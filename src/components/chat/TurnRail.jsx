import { useState } from 'react';
import { IconGlobe } from '../icons';

const BAR_H = 2; // 条高（px）
const BAR_GAP = 13.6; // 条间距（px），原 17px 缩小 20%
const STEP = BAR_H + BAR_GAP; // 每条占用的纵向步长
const BASE_LEN = 10; // 常态条长（px）
const MAX_LEN = 50; // 悬停焦点条长（px）
const DECAY = 0.5; // 向两侧递减系数，形成钟形曲线
const PAD = 8; // 矩形区域内边距
const BARZONE_W = MAX_LEN + PAD * 2; // 条区（悬停激活区）宽度：只包住条组，未到条上不提前触发
const PANEL_LEFT = PAD + MAX_LEN + 8; // 预览面板左偏移（避开最长条）
const PANEL_W = 288;
const WRAP_W = PANEL_LEFT + PANEL_W + 8; // 外层焦点矩形容器总宽
const PANEL_H = 140; // 面板估算高度，用于底部防溢出

// 钟形递减：焦点最长，向两侧按系数平滑缩短
const lenFor = (d) => Math.round(BASE_LEN + (MAX_LEN - BASE_LEN) * Math.pow(DECAY, d));

// 左侧快速定位条组：每条横杠代表一轮问答。
// 常态：所有条等长浅灰，无高亮；鼠标进入条区时按鼠标实际位置聚焦，
// 激活后整个外层矩形内移动鼠标，黑色焦点条与预览面板跟随鼠标，离开矩形才失去焦点。
// 悬停：焦点条变黑且最长，向两侧钟形递减；点击条跳转到该轮。
export default function TurnRail({ turns, onSelect }) {
  const [hover, setHover] = useState(null);
  const [mouseY, setMouseY] = useState(null);

  const railH = turns.length * BAR_H + (turns.length - 1) * BAR_GAP;
  const wrapH = railH + PAD * 2;
  const panelTop =
    mouseY == null ? PAD : Math.max(PAD, Math.min(mouseY - 16, wrapH - PANEL_H));

  /* 由鼠标在矩形内的 Y 计算焦点条（最近邻） */
  const indexAt = (rawY) =>
    Math.max(0, Math.min(turns.length - 1, Math.round((rawY - PAD - BAR_H / 2) / STEP)));

  /* 进入条区：按鼠标当前实际位置聚焦，不跳到其它位置 */
  const activate = (e) => {
    const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    setHover(indexAt(rawY));
    setMouseY(rawY);
  };

  /* 矩形内统一追踪：黑色焦点条与面板跟随鼠标位置 */
  const handleMove = (e) => {
    if (hover === null) return; // 未激活时不响应，避免鼠标未到条上就提前触发
    const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const idx = indexAt(rawY);
    setHover((prev) => (prev === idx ? prev : idx));
    setMouseY(rawY);
  };

  return (
    <div className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 md:block">
      <div
        className="relative"
        style={{ width: WRAP_W, height: wrapH }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={handleMove}
      >
        {/* 条区：悬停激活区，鼠标进入才聚焦；点击条区任意位置跳转到当前焦点轮次 */}
        <div
          className="absolute"
          style={{ left: 0, top: 0, width: BARZONE_W, height: wrapH }}
          onMouseEnter={activate}
          onClick={() => {
            if (hover !== null) onSelect(hover);
          }}
        >
          <div
            className="absolute flex flex-col items-start"
            style={{ left: PAD, top: PAD, gap: BAR_GAP }}
          >
            {turns.map((t, i) => {
              const d = hover == null ? -1 : Math.abs(i - hover);
              const isFocus = hover != null && d === 0;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`跳转到第 ${i + 1} 轮对话`}
                  style={{ width: `${hover == null ? BASE_LEN : lenFor(d)}px` }}
                  className={`h-[2px] cursor-default rounded-full transition-all duration-300 ease-smooth ${
                    isFocus ? 'bg-accent' : 'bg-[#D2D2D7]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 预览面板：跟随鼠标位置，鼠标可移入并点击操作 */}
        {hover !== null && (
          <div
            className="absolute w-72 rounded-2xl border border-black/[0.06] bg-card p-3.5 shadow-apple-lg"
            style={{ left: PANEL_LEFT, top: panelTop }}
          >
            <p className="truncate text-[13px] font-medium text-ink">
              {turns[hover].question}
            </p>
            <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-ink-muted">
              {turns[hover].reply}
            </p>
            <button
              type="button"
              onClick={() => onSelect(hover)}
              className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-accent"
            >
              <IconGlobe className="h-3.5 w-3.5" />
              跳转至此轮
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
