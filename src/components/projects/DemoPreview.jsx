import SCENES from './scenes';

// 预览窗口外壳：标题栏 + 16:9 场景内容
function DemoWindow({ title, children }) {
  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-md border border-black/[0.06] bg-page dark:border-white/10">
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] px-3 py-2 dark:border-white/10">
        <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/25" />
        <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/25" />
        <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/25" />
        <span className="ml-2 truncate text-[11px] text-ink-faint">{title}</span>
      </div>
      {children}
    </div>
  );
}

// 演示预览：按 preview.scene 分发到场景模板
export default function DemoPreview({ p }) {
  const { preview } = p;
  if (!preview) return null;
  const Scene = SCENES[preview.scene] || SCENES.terminal;
  return (
    <DemoWindow title={p.title}>
      <Scene {...preview} />
    </DemoWindow>
  );
}
