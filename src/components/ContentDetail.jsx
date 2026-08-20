import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import { formatDate } from '../data/mockData';
import { useContent } from '../hooks/useContent';
import PageShell from './PageShell';

// 详情页：按类型 + id 从全站内容里找对应文章，渲染标题/日期/正文（markdown）。
// 标题映射（eyebrow 用）
const EYEBROW = { posts: 'Blog', notes: 'Notes', projects: 'Projects' };
const LIST_ROUTE = { posts: '/blog', notes: '/notes', projects: '/projects' };

export default function ContentDetail({ type }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useContent();
  const list = data?.[type] ?? [];

  const item = useMemo(() => list.find((i) => i.id === id), [list, id]);

  // 正文渲染：markdown → HTML。把跳转链接、图片等由浏览器处理
  const html = useMemo(() => (item?.content ? marked.parse(item.content) : ''), [item]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <div className="relative">
      {/* 顶部右上角：返回上一个界面（从对话页链接跳转过来时，可回到对话） */}
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate(LIST_ROUTE[type] || '/'); // 无历史时退回对应列表页
        }}
        className="fixed right-4 top-3 z-[60] flex items-center gap-1 rounded-full border border-black/[0.08] bg-white/90 px-3 py-1.5 text-xs font-medium text-ink-soft shadow-apple backdrop-blur transition-colors hover:text-ink dark:border-white/10 dark:bg-[#1C1C1E]/90"
      >
        <span aria-hidden>←</span> 返回
      </button>
      <PageShell eyebrow={EYEBROW[type]}>
        {loading ? (
          <p className="py-8 text-sm text-ink-faint">加载中…</p>
        ) : !item ? (
          <div className="py-8">
            <p className="text-sm text-ink-faint">未找到该文章。</p>
            <Link to="/" className="mt-3 inline-block text-sm text-ink underline">
              返回
            </Link>
          </div>
        ) : (
          <article>
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{item.title}</h1>
              <p className="shrink-0 text-xs tabular-nums text-ink-faint">{formatDate(item.date)}</p>
            </div>
            {item.description && (
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>
            )}
            {/* markdown 正文 */}
            <div
              className="mt-8 space-y-5 text-[15px] leading-7 text-ink"
              // marked 输出的 HTML 已在下方 index.css 里定义样式类（article-body）
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        )}
      </PageShell>
    </div>
  );
}
