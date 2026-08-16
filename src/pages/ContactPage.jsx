import PageShell from '../components/PageShell';
import { useContent } from '../hooks/useContent';
import { IconMail, IconPhone } from '../components/icons';

export default function ContactPage() {
  const { data, loading } = useContent();
  const contact = data?.contact ?? {};

  return (
    <PageShell eyebrow="Contact">
      <div className="space-y-3">
        {loading ? (
          <p className="py-4 text-sm text-ink-faint">加载中…</p>
        ) : (
          <>
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex w-fit items-center gap-3 rounded-2xl border border-black/[0.06] bg-card dark:border-white/10 px-4 py-3 text-sm text-ink-soft shadow-apple transition-all duration-200 hover:scale-[1.02] hover:text-ink hover:shadow-apple-lg"
              >
                <IconMail className="h-4 w-4 text-ink-faint" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex w-fit items-center gap-3 rounded-2xl border border-black/[0.06] bg-card dark:border-white/10 px-4 py-3 text-sm text-ink-soft shadow-apple transition-all duration-200 hover:scale-[1.02] hover:text-ink hover:shadow-apple-lg"
              >
                <IconPhone className="h-4 w-4 text-ink-faint" />
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
