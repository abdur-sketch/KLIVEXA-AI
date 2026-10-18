import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/server/errors";
import { listMedia } from "@/server/media";
import { consumeMediaRead } from "@/server/rate-limit";
import { requireRequestSession } from "@/server/session";
import { mediaListSchema } from "@/server/validation";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireRequestSession(request);
    await consumeMediaRead(user.id);
    const query = mediaListSchema.parse({ projectId: request.nextUrl.searchParams.get("projectId") || undefined });
    return NextResponse.json({ media: await listMedia(user, query.projectId) });
  } catch (error) {
    return errorResponse(error);
  }
}
