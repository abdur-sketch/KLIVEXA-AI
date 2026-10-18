import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/server/audit";
import { assertSameOrigin, errorResponse } from "@/server/errors";
import { clearSessionCookie, getRequestSession, revokeSession, SESSION_COOKIE } from "@/server/session";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await getRequestSession(request);
    await revokeSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (session) await writeAuditLog({ userId: session.user.id, action: "auth.logged_out", resource: "session", resourceId: session.sessionId });
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
