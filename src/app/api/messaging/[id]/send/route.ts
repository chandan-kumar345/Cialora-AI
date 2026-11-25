import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { utcMidnight } from "@/lib/analytics";
import { apiError, apiOk } from "@/lib/security";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const existing = await prisma.bulkMessage.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return apiError("Bulk message not found.", 404);
    if (existing.status === "SENT") {
      return apiError("Broadcast has already been sent.", 400);
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const msg = await tx.bulkMessage.update({
        where: { id: existing.id },
        data: {
          status: "SENT",
          sentAt: now,
          deliveredCount: existing.recipientCount,
        },
      });

      if (existing.campaignId && existing.recipientCount > 0) {
        const day = utcMidnight(now);
        await tx.campaign.update({
          where: { id: existing.campaignId },
          data: {
            sentCount: { increment: existing.recipientCount },
            deliveredCount: { increment: existing.recipientCount },
            status: "ACTIVE",
          },
        });
        await tx.campaignMetricDaily.upsert({
          where: {
            campaignId_date: {
              campaignId: existing.campaignId,
              date: day,
            },
          },
          update: {
            sentCount: { increment: existing.recipientCount },
            deliveredCount: { increment: existing.recipientCount },
          },
          create: {
            userId: user.id,
            campaignId: existing.campaignId,
            date: day,
            sentCount: existing.recipientCount,
            deliveredCount: existing.recipientCount,
          },
        });
      }

      return msg;
    });

    return apiOk({ message: updated });
  });
}
