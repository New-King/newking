import { Package, PackageOpen } from 'lucide';
import { MorphIcon } from 'morphicons/react';

// 快递盒封面：闭合 Package → hover 四片顶盖向外打开（PackageOpen）
// hovered 由 CoverThumb 整块热区控制，不必指到 SVG 上
export default function BoxCoverIcon({ hovered = false, size = 40, strokeWidth = 1.5, className = '' }) {
  return (
    <MorphIcon
      icon={hovered ? PackageOpen : Package}
      spring="snappy"
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      className={className}
    />
  );
}
