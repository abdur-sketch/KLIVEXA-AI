import { ProjectsManager } from "@/components/projects-manager";
import { listProjects } from "@/server/projects";
import { requirePageSession } from "@/server/session";

export default async function ProjectsPage() {
  const { user } = await requirePageSession();
  const projects = await listProjects(user);
  return <div className="relative min-h-[calc(100vh-72px)] px-4 pb-28 pt-7 sm:px-7 lg:px-9 lg:pb-12"><div className="grid-fade pointer-events-none absolute inset-0" /><div className="relative mx-auto max-w-[1420px]"><ProjectsManager initialProjects={projects} /></div></div>;
}
