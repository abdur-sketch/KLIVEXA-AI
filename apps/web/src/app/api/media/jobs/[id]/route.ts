import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/server/errors";
import { getMediaJob } from "@/server/media";
import { consumeMediaRead } from "@/server/rate-limit";
import { requireRequestSession } from "@/server/session";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRequestSession(request);
    await consumeMediaRead(user.id);
    const { id } = await context.params;
    return NextResponse.json({ job: await getMediaJob(user, id) });
  } catch (error) { return errorResponse(error); }
}
