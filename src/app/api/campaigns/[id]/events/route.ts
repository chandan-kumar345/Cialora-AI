import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { utcMidnight } from "@/lib/analytics";
import { apiError, apiOk } from "@/lib/security";
import { campaignEventSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
    });

    if (!campaign) {
      return apiError("Campaign not found.", 404);
    }

    const body = await request.json();
    const data = campaignEventSchema.parse(body);

    const safeDelivered = Math.min(data.deliveredCount, data.sentCount || data.deliveredCount);
    const targetDate = data.date
      ? new Date(`${data.date}T00:00:00.000Z`)
      : utcMidnight(new Date());

    const result = await prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          sentCount: { increment: data.sentCount },
          deliveredCount: { increment: safeDelivered },
          clickCount: { increment: data.clickCount },
          leadCount: { increment: data.leadCount },
          revenueCents: { increment: data.revenueCents },
          status:
            campaign.status === "DRAFT" || campaign.status === "SCHEDULED"
              ? "ACTIVE"
              : campaign.status,
          startedAt: campaign.startedAt ?? new Date(),
        },
      });

      const dailyMetric = await tx.campaignMetricDaily.upsert({
        where: {
          campaignId_date: {
            campaignId: campaign.id,
            date: targetDate,
          },
        },
        update: {
          sentCount: { increment: data.sentCount },
          deliveredCount: { increment: safeDelivered },
          clickCount: { increment: data.clickCount },
          leadCount: { increment: data.leadCount },
          revenueCents: { increment: data.revenueCents },
          spendCents: { increment: data.spendCents },
          impressionsCount: { increment: data.impressionsCount },
        },
        create: {
          userId: user.id,
          campaignId: campaign.id,
          date: targetDate,
          sentCount: data.sentCount,
          deliveredCount: safeDelivered,
          clickCount: data.clickCount,
          leadCount: data.leadCount,
          revenueCents: data.revenueCents,
          spendCents: data.spendCents,
          impressionsCount: data.impressionsCount,
        },
      });

      return { updatedCampaign, dailyMetric };
    });

    return apiOk(result, 201);
  });
}
