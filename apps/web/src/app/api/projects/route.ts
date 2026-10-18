import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, parseJson } from "@/server/errors";
import { createProject, listProjects } from "@/server/projects";
import { requireRequestSession } from "@/server/session";
import { createProjectSchema } from "@/server/validation";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireRequestSession(request);
    return NextResponse.json({ projects: await listProjects(user) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { user } = await requireRequestSession(request);
    const input = createProjectSchema.parse(await parseJson(request));
    return NextResponse.json({ project: await createProject(user, input) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
