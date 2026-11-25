import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";
import { automationCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const workflows = await prisma.automationWorkflow.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return apiOk({ workflows });
  });
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = automationCreateSchema.parse(body);

    const workflow = await prisma.automationWorkflow.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description ?? null,
        triggerType: data.triggerType,
        actionChannel: data.actionChannel,
        actionTemplate: data.actionTemplate,
        isActive: data.isActive,
      },
    });

    return apiOk({ workflow }, 201);
  });
}
