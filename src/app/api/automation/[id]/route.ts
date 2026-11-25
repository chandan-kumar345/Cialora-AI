import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";
import { automationUpdateSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const existing = await prisma.automationWorkflow.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return apiError("Workflow not found.", 404);

    const body = await request.json();
    const data = automationUpdateSchema.parse(body);

    const workflow = await prisma.automationWorkflow.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description ?? null }
          : {}),
        ...(data.triggerType !== undefined ? { triggerType: data.triggerType } : {}),
        ...(data.actionChannel !== undefined
          ? { actionChannel: data.actionChannel }
          : {}),
        ...(data.actionTemplate !== undefined
          ? { actionTemplate: data.actionTemplate }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return apiOk({ workflow });
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const res = await prisma.automationWorkflow.deleteMany({
      where: { id, userId: user.id },
    });
    if (res.count === 0) return apiError("Workflow not found.", 404);
    return apiOk({ ok: true });
  });
}
