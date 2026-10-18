import type { UserRole } from "@klivexa/database";
import { AppError } from "@/server/errors";

export const permissions = [
  "profile:read", "profile:update", "project:create", "project:read", "project:update",
  "project:archive", "project:delete", "project:read:any", "project:update:any", "project:delete:any",
  "media:create", "media:read", "media:delete", "media:read:any", "media:delete:any",
] as const;

export type Permission = (typeof permissions)[number];

const grants = {
  USER: new Set<Permission>(["profile:read", "profile:update", "project:create", "project:read", "project:update", "project:archive", "project:delete", "media:create", "media:read", "media:delete"]),
  ADMIN: new Set<Permission>(permissions),
} satisfies Record<UserRole, Set<Permission>>;

export function can(role: UserRole, permission: Permission): boolean {
  return grants[role]?.has(permission) ?? false;
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new AppError(403, "FORBIDDEN", "Anda tidak memiliki akses untuk tindakan ini.");
  }
}
