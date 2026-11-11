// 作品预览动画是前端专属效果（示意动画），后端只给数据。
// 相册页和作品详情页共用同一份配置，保证两处动画一致。
export const PREVIEW_BY_ID = {
  j6: { scene: 'canvas' },
  j1: { scene: 'terminal', lines: ['正在连接集群…', '正在拉取指标…', '正在执行指令…', '任务完成 ✓'] },
  j2: { scene: 'form', input: 'portfolio.json', result: '已生成 12 个页面 ✓' },
  j7: {
    scene: 'transfer',
    code: ['A', '3', '7', '2', 'K'],
    file: 'design-spec.pdf',
    size: '2.4 MB',
  },
};

// id 可能是文件名（如 j6-canvas），取短前缀匹配；匹配不到给默认列表动画（不崩溃）
export function previewFor(id) {
  const shortId = String(id || '').split('-')[0];
  return PREVIEW_BY_ID[shortId] || { scene: 'list' };
}
