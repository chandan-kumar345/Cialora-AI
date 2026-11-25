import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user, sessionId }) => {
    const now = new Date();
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        rememberMe: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return apiOk({
      sessions: sessions.map((s) => ({
        ...s,
        isCurrent: s.id === sessionId,
      })),
    });
  });
}
