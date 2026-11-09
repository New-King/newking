export default function PageShell({ eyebrow, headerRight, note, children, wide = false }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-28 pt-8 sm:px-8 lg:px-12 lg:pt-12">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">{eyebrow}</p>
        {headerRight}
      </div>
      {/* 列表/概览铺满 4xl；文章详情保持 2xl 阅读宽度，但左边缘与 4xl 栏对齐 */}
      {children && (
        <div className={`mt-2 ${wide ? '' : 'max-w-2xl'}`}>{children}</div>
      )}
      {note && (
        <div className="mt-16 flex items-center gap-3 text-sm text-ink-faint">
          <span className="h-px w-10 bg-neutral-200 dark:bg-white/15" />
          {note}
        </div>
      )}
    </div>
  );
}
