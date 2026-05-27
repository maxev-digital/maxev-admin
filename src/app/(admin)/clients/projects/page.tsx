import { prisma } from '@/lib/db';
import ProjectsFilter from './ProjectsFilter';

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });

  const serialized = projects.map((p) => ({
    ...p,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    launchDate: p.launchDate ? p.launchDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    client: {
      ...p.client,
      launchDate: p.client.launchDate ? p.client.launchDate.toISOString() : null,
      createdAt: p.client.createdAt.toISOString(),
      updatedAt: p.client.updatedAt.toISOString(),
    },
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Active Projects</h1>
          <p className="page-sub">All client projects across all stages</p>
        </div>
      </div>

      <ProjectsFilter projects={serialized} />
    </>
  );
}
