import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";
import { adCampaignUpdateSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const existing = await prisma.adCampaign.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return apiError("Ad campaign not found.", 404);

    const body = await request.json();
    const data = adCampaignUpdateSchema.parse(body);

    const ad = await prisma.adCampaign.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.platform !== undefined ? { platform: data.platform } : {}),
        ...(data.objective !== undefined ? { objective: data.objective } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.dailyBudgetCents !== undefined
          ? { dailyBudgetCents: data.dailyBudgetCents }
          : {}),
        ...(data.spendCents !== undefined ? { spendCents: data.spendCents } : {}),
        ...(data.impressionsCount !== undefined
          ? { impressionsCount: data.impressionsCount }
          : {}),
        ...(data.clicksCount !== undefined ? { clicksCount: data.clicksCount } : {}),
        ...(data.conversionsCount !== undefined
          ? { conversionsCount: data.conversionsCount }
          : {}),
        ...(data.revenueCents !== undefined ? { revenueCents: data.revenueCents } : {}),
      },
    });

    return apiOk({ ad });
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const res = await prisma.adCampaign.deleteMany({
      where: { id, userId: user.id },
    });
    if (res.count === 0) return apiError("Ad campaign not found.", 404);
    return apiOk({ ok: true });
  });
}
