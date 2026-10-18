import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, errorResponse } from "@/server/errors";
import { deleteMedia, getMediaDTO } from "@/server/media";
import { consumeMediaRead, consumeMediaRequest } from "@/server/rate-limit";
import { requireRequestSession } from "@/server/session";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRequestSession(request);
    await consumeMediaRead(user.id);
    const { id } = await context.params;
    return NextResponse.json({ media: await getMediaDTO(user, id) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireRequestSession(request);
    await consumeMediaRequest(user.id);
    const { id } = await context.params;
    await deleteMedia(user, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
