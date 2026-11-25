import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import {
  extractRequestMeta,
  revokeAllUserSessions,
  withProtectedRoute,
  writeAuditLog,
} from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";
import { passwordChangeSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user, sessionId }) => {
    const body = await request.json();
    const data = passwordChangeSchema.parse(body);

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!record) {
      return apiError("Account not found.", 404);
    }

    const valid = await verifyPassword(data.currentPassword, record.passwordHash);
    if (!valid) {
      return apiError("Current password is incorrect.", 400);
    }

    const newHash = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await revokeAllUserSessions(user.id, sessionId);

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiOk({
      ok: true,
      message: "Password updated. Other active sessions have been revoked.",
    });
  });
}
