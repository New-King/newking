import PageShell from '../components/PageShell';
import { contact } from '../data/mockData';
import { IconMail, IconPhone } from '../components/icons';

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="联系"
      description="欢迎通过以下方式联系我，一般会在 24 小时内回复。"
      note="示例联系方式，仅用于页面演示"
    >
      <div className="space-y-3">
        <a
          href={`mailto:${contact.email}`}
          className="flex w-fit items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900"
        >
          <IconMail className="h-4 w-4 text-neutral-400" />
          {contact.email}
        </a>
        <a
          href={`tel:${contact.phone}`}
          className="flex w-fit items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900"
        >
          <IconPhone className="h-4 w-4 text-neutral-400" />
          {contact.phone}
        </a>
      </div>
    </PageShell>
  );
}
