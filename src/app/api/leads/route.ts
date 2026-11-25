import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { utcMidnight } from "@/lib/analytics";
import { apiError, apiOk } from "@/lib/security";
import { leadCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const stage = request.nextUrl.searchParams.get("stage")?.trim();
    const search = request.nextUrl.searchParams.get("search")?.trim();

    const leads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        ...(stage && stage !== "ALL" ? { stage } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search } },
                { email: { contains: search } },
                { company: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return apiOk({ leads });
  });
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = leadCreateSchema.parse(body);

    if (data.campaignId) {
      const ownedCampaign = await prisma.campaign.findFirst({
        where: { id: data.campaignId, userId: user.id },
        select: { id: true },
      });
      if (!ownedCampaign) {
        return apiError("Linked campaign not found.", 404);
      }
    }

    const now = new Date();
    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          userId: user.id,
          campaignId: data.campaignId ?? null,
          fullName: data.fullName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          company: data.company ?? null,
          country: data.country ?? null,
          sourceChannel: data.sourceChannel,
          stage: data.stage,
          estimatedValueCents: data.estimatedValueCents,
          tags: data.tags,
          notes: data.notes ?? null,
        },
      });

      if (data.campaignId) {
        const day = utcMidnight(now);
        await tx.campaign.update({
          where: { id: data.campaignId },
          data: { leadCount: { increment: 1 } },
        });
        await tx.campaignMetricDaily.upsert({
          where: {
            campaignId_date: {
              campaignId: data.campaignId,
              date: day,
            },
          },
          update: { leadCount: { increment: 1 } },
          create: {
            userId: user.id,
            campaignId: data.campaignId,
            date: day,
            leadCount: 1,
          },
        });
      }

      const activeAutomations = await tx.automationWorkflow.findMany({
        where: {
          userId: user.id,
          isActive: true,
          triggerType: "LEAD_CREATED",
        },
      });

      if (activeAutomations.length > 0) {
        await tx.automationWorkflow.updateMany({
          where: {
            id: { in: activeAutomations.map((a) => a.id) },
            userId: user.id,
          },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: now,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "New lead captured",
          message: `${created.fullName} added to Leads CRM (${created.stage}).`,
          category: "LEAD",
          actionUrl: "/leads",
        },
      });

      return created;
    });

    return apiOk({ lead }, 201);
  });
}
