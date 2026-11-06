import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useVersions } from '../../hooks/useVersions';
import { IconChevron } from '../icons';

/**
 * 历史模式下的侧栏内容：版本列表 + 当前版本下的页面列表。
 * - 点版本：切到该版本（停留在版本列表，方便继续选页面）
 * - 点页面：进入具体截图；移动端通过 onClose 收起抽屉
 */
export default function VersionNav({ onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { versions, loading, error } = useVersions();

  const match = pathname.match(/^\/history(?:\/([^/]+))?(?:\/([^/]+))?/);
  const activeVersionId = match?.[1] || versions[0]?.id;
  const activePageId = match?.[2];

  if (loading) {
    return (
      <div className="space-y-3 px-2 pt-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-2.5 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/10"
            style={{ width: `${70 - i * 8}%` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="px-2 pt-1 text-[11px] leading-5 text-ink-faint">历史版本加载失败</p>;
  }

  if (versions.length === 0) {
    return <p className="px-2 pt-1 text-[11px] text-ink-faint">还没有历史版本</p>;
  }

  return (
    <div className="space-y-1">
      {versions.map((version, index) => {
        const active = version.id === activeVersionId;
        const current = index === 0;
        return (
          <div key={version.id}>
            <button
              type="button"
              onClick={() => navigate(`/history/${version.id}`)}
              aria-current={active ? 'page' : undefined}
              className={`w-full rounded-lg px-2 py-2 text-left transition-colors duration-200 ${
                active
                  ? 'bg-black/[0.06] dark:bg-white/10'
                  : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] tabular-nums tracking-[0.08em] text-ink-faint">
                  {version.label || version.date}
                </span>
                {current && (
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] text-ink-muted dark:bg-white/10">
                    当前
                  </span>
                )}
              </div>
              <p
                className={`mt-0.5 truncate text-[12.5px] ${
                  active ? 'font-medium text-ink' : 'text-ink-soft'
                }`}
                title={version.title}
              >
                {version.title}
              </p>
            </button>

            {active && (
              <ul className="ml-[9px] mt-1 space-y-px border-l border-black/[0.06] pl-2 dark:border-white/[0.08]">
                {version.pages.map((page) => {
                  const pageActive = page.id === (activePageId || version.pages[0]?.id);
                  return (
                    <li key={page.id}>
                      <Link
                        to={`/history/${version.id}/${page.id}`}
                        onClick={onClose}
                        aria-current={pageActive ? 'page' : undefined}
                        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[12px] transition-colors duration-200 ${
                          pageActive
                            ? 'bg-black/[0.06] text-ink dark:bg-white/10'
                            : 'text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className="truncate">{page.label}</span>
                        <IconChevron className="h-2.5 w-2.5 shrink-0 text-ink-faint" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
