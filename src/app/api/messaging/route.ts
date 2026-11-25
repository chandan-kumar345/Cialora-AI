import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { utcMidnight } from "@/lib/analytics";
import { apiError, apiOk } from "@/lib/security";
import { bulkMessageCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const messages = await prisma.bulkMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: { id: true, name: true },
        },
      },
    });
    return apiOk({ messages });
  });
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = bulkMessageCreateSchema.parse(body);

    if (data.campaignId) {
      const ownedCampaign = await prisma.campaign.findFirst({
        where: { id: data.campaignId, userId: user.id },
        select: { id: true },
      });
      if (!ownedCampaign) {
        return apiError("Linked campaign not found.", 404);
      }
    }

    let recipientCount = data.recipientCount;
    if (data.audienceFilter !== "CUSTOM_LIST") {
      const stageFilter =
        data.audienceFilter === "NEW_LEADS"
          ? "NEW"
          : data.audienceFilter === "QUALIFIED_LEADS"
            ? "QUALIFIED"
            : undefined;
      recipientCount = await prisma.lead.count({
        where: {
          userId: user.id,
          ...(stageFilter ? { stage: stageFilter } : {}),
        },
      });
    }

    const now = new Date();
    const status = data.sendImmediately
      ? "SENT"
      : data.scheduledAt
        ? "SCHEDULED"
        : "DRAFT";

    const deliveredCount = data.sendImmediately ? recipientCount : 0;

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.bulkMessage.create({
        data: {
          userId: user.id,
          campaignId: data.campaignId ?? null,
          title: data.title,
          channel: data.channel,
          subject: data.subject ?? null,
          body: data.body,
          audienceFilter: data.audienceFilter,
          recipientCount,
          deliveredCount,
          failedCount: 0,
          status,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          sentAt: data.sendImmediately ? now : null,
        },
      });

      if (data.sendImmediately && data.campaignId && recipientCount > 0) {
        const day = utcMidnight(now);
        await tx.campaign.update({
          where: { id: data.campaignId },
          data: {
            sentCount: { increment: recipientCount },
            deliveredCount: { increment: deliveredCount },
            status: "ACTIVE",
            startedAt: now,
          },
        });
        await tx.campaignMetricDaily.upsert({
          where: {
            campaignId_date: {
              campaignId: data.campaignId,
              date: day,
            },
          },
          update: {
            sentCount: { increment: recipientCount },
            deliveredCount: { increment: deliveredCount },
          },
          create: {
            userId: user.id,
            campaignId: data.campaignId,
            date: day,
            sentCount: recipientCount,
            deliveredCount,
          },
        });
      }

      if (data.sendImmediately) {
        await tx.notification.create({
          data: {
            userId: user.id,
            title: "Bulk broadcast logged",
            message: `"${created.title}" via ${created.channel} queued for ${recipientCount} recipients.`,
            category: "CAMPAIGN",
            actionUrl: "/messaging",
          },
        });
      }

      return created;
    });

    return apiOk({ message }, 201);
  });
}
