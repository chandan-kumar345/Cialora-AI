import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  extractRequestMeta,
  withProtectedRoute,
  writeAuditLog,
} from "@/lib/auth";
import { apiOk } from "@/lib/security";
import { planUpdateSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = planUpdateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { planTier: data.planTier },
      select: {
        id: true,
        email: true,
        fullName: true,
        workspaceName: true,
        country: true,
        currency: true,
        locale: true,
        timezone: true,
        language: true,
        planTier: true,
        createdAt: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Workspace plan updated",
        message: `Your workspace plan is now set to ${updated.planTier}.`,
        category: "SYSTEM",
        actionUrl: "/settings",
      },
    });

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "PLAN_UPDATED",
      entityType: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { planTier: updated.planTier },
    });

    return apiOk({ user: updated });
  });
}
