export default function PageShell({ eyebrow, title, description, note, children }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-24 pt-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">{eyebrow}</p>
      <h1 className="mt-3 text-[26px] font-medium tracking-tight text-ink">{title}</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-ink-muted">{description}</p>
      {children && <div className="mt-10">{children}</div>}
      {note && (
        <div className="mt-16 flex items-center gap-3 text-sm text-ink-faint">
          <span className="h-px w-10 bg-neutral-200" />
          {note}
        </div>
      )}
    </div>
  );
}
