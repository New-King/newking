import PageShell from '../components/PageShell';
import { useContent } from '../hooks/useContent';
import { IconMail, IconPhone } from '../components/icons';

export default function ContactPage() {
  const { data, loading, error } = useContent();
  const contact = data?.contact ?? {};

  return (
    <PageShell eyebrow="Contact">
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
        {contact?.title || '联系方式'}
      </h1>
      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="py-4 text-sm text-ink-faint">加载中…</p>
        ) : error ? (
          <p className="py-4 text-sm text-ink-faint">内容加载失败，请确认后端服务已启动。</p>
        ) : (
          <>
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex w-fit items-center gap-3 rounded-2xl border border-black/[0.06] surface-elevated px-4 py-3 text-sm text-ink-soft transition-all duration-200 hover:scale-[1.02] hover:text-ink dark:border-white/[0.06]"
              >
                <IconMail className="h-4 w-4 text-ink-muted" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex w-fit items-center gap-3 rounded-2xl border border-black/[0.06] surface-elevated px-4 py-3 text-sm text-ink-soft transition-all duration-200 hover:scale-[1.02] hover:text-ink dark:border-white/[0.06]"
              >
                <IconPhone className="h-4 w-4 text-ink-muted" />
                {contact.phone}
              </a>
            )}
            {!contact.email && !contact.phone && (
              <p className="text-sm text-ink-faint">暂无联系方式</p>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
