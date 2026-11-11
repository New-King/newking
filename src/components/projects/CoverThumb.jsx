import { useState } from 'react';
import BoxCoverIcon from './BoxCoverIcon';

// 封面几何图形（中性色，随主题色）—— 每个作品一种
const COVER_SHAPES = {
  ring: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <circle cx="26" cy="26" r="21" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="13" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  square: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <rect x="8" y="8" width="36" height="36" strokeWidth="1.5" />
      <rect x="17" y="17" width="18" height="18" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  triangle: (
    <svg width="42" height="38" viewBox="0 0 56 50" fill="none" stroke="currentColor">
      <path d="M28 6 52 44H4Z" strokeWidth="1.5" />
      <path d="M28 20 41 40H15Z" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  dots: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="currentColor">
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={10 + r * 12} cy={10 + c * 12} r="1.7" />
        ))
      )}
    </svg>
  ),
  cross: (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none" stroke="currentColor">
      <path d="M4 26h44" strokeWidth="1.5" />
      <path d="M26 4v44" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="8" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
};

// 封面缩略图（含细网格线，深浅模式自适应）
export default function CoverThumb({ shape, active, small, href }) {
  const [boxHovered, setBoxHovered] = useState(false);
  const iconSize = small ? 26 : 44;
  const isBox = shape === 'box';

  const thumb = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-black/[0.04] via-black/[0.01] to-black/[0.08] dark:from-white/[0.05] dark:via-transparent dark:to-white/[0.1] ${
        small ? 'h-12 w-12' : 'h-24 w-24'
      }`}
      onMouseEnter={isBox ? () => setBoxHovered(true) : undefined}
      onMouseLeave={isBox ? () => setBoxHovered(false) : undefined}
    >
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div
        className={`absolute inset-0 flex items-center justify-center text-ink-faint transition-opacity duration-200 ${
          active ? 'opacity-100' : 'opacity-60'
        }`}
      >
        {isBox ? (
          <BoxCoverIcon hovered={boxHovered} size={iconSize} strokeWidth={1.5} />
        ) : (
          COVER_SHAPES[shape]
        )}
      </div>
    </div>
  );

  if (href && isBox) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block shrink-0 rounded-md transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        aria-label="访问作品官网"
        onFocus={() => setBoxHovered(true)}
        onBlur={() => setBoxHovered(false)}
      >
        {thumb}
      </a>
    );
  }

  return thumb;
}
