import BlockRenderer from './blocks';

function WaitingDots() {
  return (
    <div className="flex h-9 w-16 items-center justify-center gap-1.5 rounded-2xl bg-card shadow-apple">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-dot rounded-full bg-ink-faint"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// 极简气泡：无头像、无名字。AI 回答居左，用户输入居右。
export default function MessageItem({ message, onBlockDone }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] animate-fade-in-up whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-apple">
          {message.text}
        </div>
      </div>
    );
  }

  // 从工具卡片块里收集"相关文章"列表，供文本里的引用标签 [N] 使用
  const related =
    message.blocks
      ?.filter((b) => b.type === 'tool')
      .flatMap((b) => b.related || []) || [];

  return (
    <div className="flex flex-col gap-3">
      {message.blocks.map((b) => (
        <BlockRenderer key={b.id} block={b} paused={message.paused} onDone={onBlockDone} related={related} />
      ))}
      {message.blocks.length === 0 && <WaitingDots />}
    </div>
  );
}
