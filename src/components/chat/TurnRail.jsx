import { useState } from 'react';
import { IconGlobe, IconTrash } from '../icons';

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
export default function TurnRail({ turns, onSelect, onClear }) {
  const [hover, setHover] = useState(null);

  const railH = turns.length * BAR_H + (turns.length - 1) * BAR_GAP;
  // 底部给删除按钮留出空间
  const CLEAR_H = 40; // 删除按钮区域高度
  const wrapH = railH + PAD * 2 + CLEAR_H;

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
            // 进入定位条区域：暂停背景网格动画（避免鼠标在此区域移动触发线/圆点特效）
            window.dispatchEvent(new CustomEvent('bg-grid-pause', { detail: { add: true } }));
            const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
            setHover(indexAt(rawY));
          }}
          onMouseMove={(e) => {
            if (hover === null) return;
            const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
            setHover((prev) => (prev === indexAt(rawY) ? prev : indexAt(rawY)));
          }}
          onMouseLeave={() => {
            // 离开定位条区域：恢复背景网格动画
            window.dispatchEvent(new CustomEvent('bg-grid-pause', { detail: { add: false } }));
            setHover(null);
          }}
          onClick={() => {
            if (hover !== null) onSelect(hover);
          }}
        >
          {/* 背景网格柔化层：把条区底下的网格线模糊掉，让细条浮在干净背景上；
              用 mask 渐变让四边柔和过渡（不僵硬） */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              maskImage:
                'linear-gradient(90deg, transparent 0%, black 30%, black 70%, transparent 100%), linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0%, black 30%, black 70%, transparent 100%), linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          />
          <div
            className="absolute flex flex-col items-start"
            style={{ left: PAD, top: PAD, gap: BAR_GAP }}
          >
            {turns.map((t, i) => {
              const d = hover == null ? -1 : Math.abs(i - hover);
              const isFocus = hover != null && d === 0;
              // 问题2：最下面那根线（最后一轮）常态加深，同 hover 焦点色
              const isLast = i === turns.length - 1;
              const barColor =
                isFocus || (isLast && hover == null)
                  ? 'bg-accent dark:bg-white'
                  : 'bg-[#D2D2D7] dark:bg-[#5A5A5E]';
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`跳转到第 ${i + 1} 轮对话`}
                  style={{ width: `${hover == null ? BASE_LEN : lenFor(d)}px` }}
                  className={`h-[2px] cursor-default rounded-full transition-all duration-300 ease-smooth ${barColor}`}
                />
              );
            })}

            {/* 问题1：底部删除按钮，清空聊天记录 */}
            <button
              type="button"
              aria-label="清空聊天记录"
              onClick={(e) => {
                e.stopPropagation();
                onClear && onClear();
              }}
              className="mt-3 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-accent/10 hover:text-accent dark:hover:bg-white/10"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
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
