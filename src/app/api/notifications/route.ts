import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";

const markReadSchema = z.object({
  id: z.string().optional(),
  markAll: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return apiOk({ notifications, unreadCount });
  });
}

export async function PATCH(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = markReadSchema.parse(body);

    if (data.markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (data.id) {
      await prisma.notification.updateMany({
        where: { id: data.id, userId: user.id },
        data: { isRead: true },
      });
    }

    return apiOk({ ok: true });
  });
}
