import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
      },
    });
    return apiOk({ logs });
  });
}
