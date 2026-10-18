import "server-only";

import type { Prisma } from "@klivexa/database";
import { db } from "@/server/db";

export type AuditEvent = {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(event: AuditEvent): Promise<void> {
  await db.auditLog.create({ data: event });
}
