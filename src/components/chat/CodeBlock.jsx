import { useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml';
import { IconCheck, IconCopy } from '../icons';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('xml', xml);

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function CodeSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse overflow-hidden rounded-2xl bg-[#1D1D1F] shadow-apple">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
        <div className="h-2.5 w-14 rounded bg-neutral-700/70" />
        <div className="h-5 w-12 rounded bg-neutral-700/70" />
      </div>
      <div className="space-y-2.5 p-4">
        <div className="h-3 w-2/3 rounded bg-neutral-700/60" />
        <div className="h-3 w-1/2 rounded bg-neutral-700/60" />
        <div className="h-3 w-3/4 rounded bg-neutral-700/60" />
        <div className="h-3 w-2/5 rounded bg-neutral-700/60" />
      </div>
    </div>
  );
}

export default function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    try {
      return hljs.highlight(block.code, { language: block.language }).value;
    } catch {
      return escapeHtml(block.code);
    }
  }, [block.code, block.language]);

  if (block.status !== 'done') return <CodeSkeleton />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in-up overflow-hidden rounded-2xl bg-[#1D1D1F] shadow-apple">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-xs text-neutral-500">{block.language}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? '已复制' : '复制代码'}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          {copied ? (
            <>
              <IconCheck className="h-3.5 w-3.5" />
              已复制
            </>
          ) : (
            <>
              <IconCopy className="h-3.5 w-3.5" />
              复制
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code
          className={`font-mono language-${block.language}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
