import "server-only";

import type { ProjectStatus } from "@klivexa/database";
import type { SessionUser } from "@/server/session";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { assertPermission, can } from "@/server/rbac";

export type ProjectDTO = {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clipCount: number;
};

function projectWhere(viewer: SessionUser, id?: string) {
  return {
    ...(id ? { id } : {}),
    deletedAt: null,
    ...(can(viewer.role, "project:read:any") ? {} : { userId: viewer.id }),
  };
}

function toDTO(project: {
  id: string; title: string; description: string | null; status: ProjectStatus; archivedAt: Date | null;
  createdAt: Date; updatedAt: Date; _count: { clips: number };
}): ProjectDTO {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    clipCount: project._count.clips,
  };
}

const projectSelect = {
  id: true, title: true, description: true, status: true, archivedAt: true, createdAt: true, updatedAt: true,
  _count: { select: { clips: true } },
} as const;

export async function listProjects(viewer: SessionUser): Promise<ProjectDTO[]> {
  assertPermission(viewer.role, "project:read");
  const rows = await db.project.findMany({ where: projectWhere(viewer), select: projectSelect, orderBy: { updatedAt: "desc" } });
  return rows.map(toDTO);
}

export async function createProject(viewer: SessionUser, input: { title: string; description?: string }): Promise<ProjectDTO> {
  assertPermission(viewer.role, "project:create");
  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({ data: { userId: viewer.id, title: input.title, description: input.description || null }, select: projectSelect });
    await tx.auditLog.create({ data: { userId: viewer.id, action: "project.created", resource: "project", resourceId: created.id } });
    return created;
  });
  return toDTO(project);
}

async function requireProject(viewer: SessionUser, id: string) {
  assertPermission(viewer.role, "project:read");
  const project = await db.project.findFirst({ where: projectWhere(viewer, id), select: { id: true, userId: true } });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Proyek tidak ditemukan.");
  return project;
}

export async function updateProject(
  viewer: SessionUser,
  id: string,
  input: { title?: string; description?: string | null; archived?: boolean },
): Promise<ProjectDTO> {
  const project = await requireProject(viewer, id);
  assertPermission(viewer.role, input.archived === undefined ? "project:update" : "project:archive");
  if (project.userId !== viewer.id && !can(viewer.role, "project:update:any")) throw new AppError(403, "FORBIDDEN", "Akses proyek ditolak.");
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.project.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.archived !== undefined ? { archivedAt: input.archived ? new Date() : null } : {}),
      },
      select: projectSelect,
    });
    await tx.auditLog.create({ data: { userId: viewer.id, action: input.archived === undefined ? "project.updated" : input.archived ? "project.archived" : "project.restored", resource: "project", resourceId: id } });
    return row;
  });
  return toDTO(updated);
}

export async function softDeleteProject(viewer: SessionUser, id: string): Promise<void> {
  const project = await requireProject(viewer, id);
  assertPermission(viewer.role, "project:delete");
  if (project.userId !== viewer.id && !can(viewer.role, "project:delete:any")) throw new AppError(403, "FORBIDDEN", "Akses proyek ditolak.");
  await db.$transaction([
    db.project.update({ where: { id }, data: { deletedAt: new Date() } }),
    db.auditLog.create({ data: { userId: viewer.id, action: "project.deleted", resource: "project", resourceId: id } }),
  ]);
}

export async function getDashboardStats(viewer: SessionUser) {
  const where = projectWhere(viewer);
  const mediaWhere = { deletedAt: null, ...(can(viewer.role, "media:read:any") ? {} : { userId: viewer.id }) };
  const [total, active, archived, clips, mediaTotal, mediaReady, mediaProcessing, recent] = await Promise.all([
    db.project.count({ where }),
    db.project.count({ where: { ...where, archivedAt: null } }),
    db.project.count({ where: { ...where, archivedAt: { not: null } } }),
    db.clip.count({ where: { project: where } }),
    db.mediaAsset.count({ where: mediaWhere }),
    db.mediaAsset.count({ where: { ...mediaWhere, status: "READY" } }),
    db.mediaAsset.count({ where: { ...mediaWhere, status: { in: ["QUEUED", "PROCESSING"] } } }),
    db.project.findMany({ where, select: projectSelect, orderBy: { updatedAt: "desc" }, take: 3 }),
  ]);
  return { total, active, archived, clips, mediaTotal, mediaReady, mediaProcessing, recent: recent.map(toDTO) };
}
