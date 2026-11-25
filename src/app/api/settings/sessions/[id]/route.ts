import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user, sessionId }) => {
    const { id } = await context.params;
    if (id === sessionId) {
      return apiError("Use sign out to terminate the current session.", 400);
    }

    const res = await prisma.session.updateMany({
      where: { id, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (res.count === 0) {
      return apiError("Session not found.", 404);
    }

    return apiOk({ ok: true });
  });
}
