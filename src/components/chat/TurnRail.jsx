import { useState } from 'react';
import { IconGlobe } from '../icons';

const BAR_H = 2; // 条高（px）
const BAR_GAP = 13.6; // 条间距（px）
const STEP = BAR_H + BAR_GAP; // 每条占用的纵向步长
const BASE_LEN = 10; // 常态条长（px）
const MAX_LEN = 50; // 悬停焦点条长（px）
const DECAY = 0.5; // 向两侧递减系数，形成钟形曲线
const PAD = 8; // 矩形区域内边距
const PANEL_W = 288; // 预览面板宽度
const PANEL_H = 132; // 预览面板估算高度（用于垂直居中跟随焦点条）
// 面板浮出：条区右侧。用 fixed 定位浮在对话区上方，不占用/扩展容器宽度，
// 避免透明容器横跨对话区拦截文字复制。
const PANEL_OFFSET_X = PAD + MAX_LEN; // 面板紧贴变长的线右侧（无额外间隔）

// 钟形递减：焦点最长，向两侧按系数平滑缩短
const lenFor = (d) => Math.round(BASE_LEN + (MAX_LEN - BASE_LEN) * Math.pow(DECAY, d));

// 左侧快速定位条组：每条横杠代表一轮问答。
// 简单交互：鼠标悬停到条区才显示预览面板（纯展示，pointer-events-none 不拦截复制）；
// 鼠标移出条区，预览隐藏。点击条跳转该轮。
export default function TurnRail({ turns, onSelect }) {
  const [hover, setHover] = useState(null);

  const railH = turns.length * BAR_H + (turns.length - 1) * BAR_GAP;
  const wrapH = railH + PAD * 2;

  /* 由鼠标在条区内的 Y 计算焦点条（最近邻） */
  const indexAt = (rawY) =>
    Math.max(0, Math.min(turns.length - 1, Math.round((rawY - PAD - BAR_H / 2) / STEP)));

  return (
    <div className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 md:block">
      {/* 容器只包住条区本身（窄），不延伸到中间，不挡对话区文字复制 */}
      <div
        className="relative pointer-events-none"
        style={{ width: MAX_LEN + PAD * 2, height: wrapH }}
        onMouseLeave={() => setHover(null)}
      >
        {/* 条区：悬停激活区（pointer-events-auto 保留交互）；离开条区即隐藏预览 */}
        <div
          className="absolute pointer-events-auto"
          style={{ left: 0, top: 0, width: MAX_LEN + PAD * 2, height: wrapH }}
          onMouseEnter={(e) => {
            const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
            setHover(indexAt(rawY));
          }}
          onMouseMove={(e) => {
            if (hover === null) return;
            const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
            setHover((prev) => (prev === indexAt(rawY) ? prev : indexAt(rawY)));
          }}
          onMouseLeave={() => setHover(null)}
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
                    isFocus
                      ? 'bg-accent dark:bg-white'
                      : 'bg-[#D2D2D7] dark:bg-[#3A3A3C]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 预览面板：纯展示（pointer-events-none 不拦截复制），fixed 浮出，
            垂直位置跟随焦点条（哪条变长就在它右侧显示） */}
        {hover !== null && turns[hover] && (
          <div
            className="pointer-events-none fixed w-72 rounded-2xl border border-black/[0.06] bg-card p-3.5 shadow-apple-lg dark:border-white/10"
            style={{
              left: `calc(0.3rem + ${PANEL_OFFSET_X}px)`,
              top: `calc(50% + ${PAD + hover * STEP - (railH / 2)}px - ${PANEL_H / 2}px)`,
            }}
          >
            <p className="truncate text-[13px] font-medium text-ink">
              {turns[hover].question}
            </p>
            <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-ink-muted">
              {turns[hover].reply}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
              <IconGlobe className="h-3.5 w-3.5" />
              跳转至此轮（点击左侧条）
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
