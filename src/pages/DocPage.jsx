import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import PageShell from '../components/PageShell';
import { useContent } from '../hooks/useContent';
import { formatDate } from '../data/mockData';

// 关于 / 简历：内容来自 content/about.md、content/resume.md
export default function DocPage({ type, eyebrow }) {
  const { data, loading, error } = useContent();
  const item = data?.[type];
  const html = useMemo(
    () => (item?.content ? marked.parse(item.content) : ''),
    [item?.content]
  );

  return (
    <PageShell
      eyebrow={eyebrow}
      headerRight={
        <Link
          to="/"
          className="text-[12px] text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          ← 返回首页
        </Link>
      }
    >
      {loading ? (
        <p className="py-8 text-sm text-ink-faint">加载中…</p>
      ) : error ? (
        <p className="py-8 text-sm text-ink-faint">内容加载失败，请确认后端服务已启动。</p>
      ) : !item ? (
        <p className="py-8 text-sm text-ink-faint">未找到该页面。</p>
      ) : (
        <article className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{item.title}</h1>
            <p className="shrink-0 text-xs tabular-nums text-ink-muted">{formatDate(item.date)}</p>
          </div>
          {item.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>
          )}
          <div
            className="article-body mt-8 space-y-5 text-[15px] leading-7 text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      )}
    </PageShell>
  );
}
