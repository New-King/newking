import PageShell from '../components/PageShell';
import ProjectCard from '../components/projects/ProjectCard';
import { projects } from '../data/mockData';

export default function ProjectsPage() {
  return (
    <PageShell
      eyebrow="Projects"
      note="内容筹备中 · 悬停顶部导航可预览最新项目"
    >
      {/* 单列项目列表：左侧封面缩略图 + 右侧标题行/描述；悬停 1s 展开演示预览 */}
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </PageShell>
  );
}
