import PageShell from '../components/PageShell';
import { contact } from '../data/mockData';
import { IconMail, IconPhone } from '../components/icons';

export default function ContactPage() {
  return (
    <PageShell eyebrow="Contact" note="示例联系方式，仅用于页面演示">
      <div className="space-y-3">
        <a
          href={`mailto:${contact.email}`}
          className="flex w-fit items-center gap-3 rounded-2xl border border-black/[0.06] bg-card dark:border-white/10 px-4 py-3 text-sm text-ink-soft shadow-apple transition-all duration-200 hover:scale-[1.02] hover:text-ink hover:shadow-apple-lg"
        >
          <IconMail className="h-4 w-4 text-ink-faint" />
          {contact.email}
        </a>
        <a
          href={`tel:${contact.phone}`}
          className="flex w-fit items-center gap-3 rounded-2xl border border-black/[0.06] bg-card dark:border-white/10 px-4 py-3 text-sm text-ink-soft shadow-apple transition-all duration-200 hover:scale-[1.02] hover:text-ink hover:shadow-apple-lg"
        >
          <IconPhone className="h-4 w-4 text-ink-faint" />
          {contact.phone}
        </a>
      </div>
    </PageShell>
  );
}
