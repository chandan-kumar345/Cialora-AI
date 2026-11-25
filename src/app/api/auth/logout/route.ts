import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  extractRequestMeta,
  getAuthContext,
  revokeSessionByToken,
  SESSION_COOKIE_NAME,
  writeAuditLog,
} from "@/lib/auth";
import { apiError, validateCsrfOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return apiError("Invalid request origin.", 403);
  }

  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const ctx = await getAuthContext(request);

  if (rawToken) {
    await revokeSessionByToken(rawToken);
  }

  if (ctx) {
    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: "LOGOUT",
      entityType: "Session",
      entityId: ctx.sessionId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, request);
  return response;
}
