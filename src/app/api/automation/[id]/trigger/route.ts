import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const existing = await prisma.automationWorkflow.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return apiError("Workflow not found.", 404);
    if (!existing.isActive) {
      return apiError("Workflow is paused. Activate it before running.", 400);
    }

    const now = new Date();
    const workflow = await prisma.$transaction(async (tx) => {
      const updated = await tx.automationWorkflow.update({
        where: { id: existing.id },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: now,
        },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Automation executed",
          message: `Workflow "${updated.name}" ran via ${updated.actionChannel}.`,
          category: "AUTOMATION",
          actionUrl: "/automation",
        },
      });
      return updated;
    });

    return apiOk({ workflow });
  });
}
