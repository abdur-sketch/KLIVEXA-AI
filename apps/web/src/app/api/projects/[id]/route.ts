import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, parseJson } from "@/server/errors";
import { softDeleteProject, updateProject } from "@/server/projects";
import { requireRequestSession } from "@/server/session";
import { updateProjectSchema } from "@/server/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireRequestSession(request);
    const { id } = await context.params;
    const input = updateProjectSchema.parse(await parseJson(request));
    return NextResponse.json({ project: await updateProject(user, id, input) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireRequestSession(request);
    const { id } = await context.params;
    await softDeleteProject(user, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
