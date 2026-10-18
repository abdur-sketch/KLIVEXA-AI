import { MediaLibrary } from "@/components/media-library";
import { listMedia } from "@/server/media";
import { listProjects } from "@/server/projects";
import { requirePageSession } from "@/server/session";

export default async function MediaPage() {
  const { user } = await requirePageSession();
  const [media, projects] = await Promise.all([listMedia(user), listProjects(user)]);
  return (
    <div className="min-h-[calc(100vh-72px)] px-4 pb-28 pt-7 sm:px-7 lg:px-9 lg:pb-12">
      <div className="mx-auto max-w-[1420px]">
        <MediaLibrary initialMedia={media} projects={projects.filter((project) => !project.archivedAt).map(({ id, title }) => ({ id, title }))} />
      </div>
    </div>
  );
}
