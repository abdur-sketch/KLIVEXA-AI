import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { assertSameOrigin, errorResponse, parseJson } from "@/server/errors";
import { assertPermission } from "@/server/rbac";
import { requireRequestSession } from "@/server/session";
import { profileSchema } from "@/server/validation";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireRequestSession(request);
    assertPermission(user.role, "profile:read");
    return NextResponse.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { user } = await requireRequestSession(request);
    assertPermission(user.role, "profile:update");
    const input = profileSchema.parse(await parseJson(request));
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.user.update({ where: { id: user.id }, data: { name: input.name }, select: { id: true, name: true, email: true, role: true } });
      await tx.auditLog.create({ data: { userId: user.id, action: "profile.updated", resource: "user", resourceId: user.id } });
      return result;
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
