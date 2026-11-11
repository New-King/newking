import { formatDate } from '../../data/mockData';

// 作品信息区：标题 / 日期 / 简介 / 外链。相册卡片和详情页共用，保证两处一致。
export default function ProjectMeta({ title, date, description, url }) {
  return (
    <div className="flex min-h-24 min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 min-w-0 flex-1 text-[17px] font-medium leading-snug text-ink">{title}</p>
        <p className="shrink-0 text-xs tabular-nums text-ink-muted">{formatDate(date)}</p>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">{description}</p>
      <div className="mt-auto h-5 pt-0.5">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-w-0 items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
              aria-hidden
            >
              <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="truncate underline decoration-black/10 underline-offset-2 transition-colors group-hover:decoration-black/25 dark:decoration-white/15 dark:group-hover:decoration-white/30">
              {url}
            </span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
