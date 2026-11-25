import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const res = await prisma.bulkMessage.deleteMany({
      where: { id, userId: user.id },
    });
    if (res.count === 0) return apiError("Message not found.", 404);
    return apiOk({ ok: true });
  });
}
