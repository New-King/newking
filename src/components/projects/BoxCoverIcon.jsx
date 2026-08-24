import { useState } from 'react';
import { Package, PackageOpen } from 'lucide';
import { MorphIcon } from 'morphicons/react';

// 快递盒封面：闭合 Package → hover 四片顶盖向外打开（PackageOpen）
export default function BoxCoverIcon({ size = 40, strokeWidth = 1.5, className = '' }) {
  const [hovered, setHovered] = useState(false);

  return (
    <MorphIcon
      icon={hovered ? PackageOpen : Package}
      spring="snappy"
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    />
  );
}
