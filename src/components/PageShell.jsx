export default function PageShell({ eyebrow, headerRight, note, children }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-24 pt-16">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">{eyebrow}</p>
        {headerRight}
      </div>
      {children && <div className="mt-2">{children}</div>}
      {note && (
        <div className="mt-16 flex items-center gap-3 text-sm text-ink-faint">
          <span className="h-px w-10 bg-neutral-200 dark:bg-white/15" />
          {note}
        </div>
      )}
    </div>
  );
}
