import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  extractRequestMeta,
  withProtectedRoute,
  writeAuditLog,
} from "@/lib/auth";
import { apiOk } from "@/lib/security";
import { campaignCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const status = request.nextUrl.searchParams.get("status")?.trim();
    const channel = request.nextUrl.searchParams.get("channel")?.trim();
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(1, limitParam), 100)
      : 50;

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: user.id,
        ...(status && status !== "ALL" ? { status } : {}),
        ...(channel && channel !== "ALL" ? { channel } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return apiOk({ campaigns });
  });
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = campaignCreateSchema.parse(body);

    const now = new Date();
    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          userId: user.id,
          name: data.name,
          description: data.description,
          channel: data.channel,
          type: data.type,
          status: data.status,
          budgetCents: data.budgetCents,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          startedAt: data.status === "ACTIVE" ? now : null,
          completedAt: data.status === "COMPLETED" ? now : null,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Campaign created",
          message: `"${created.name}" (${created.channel}) is saved as ${created.status}.`,
          category: "CAMPAIGN",
          actionUrl: "/campaigns",
        },
      });

      return created;
    });

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "CAMPAIGN_CREATED",
      entityType: "Campaign",
      entityId: campaign.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiOk({ campaign }, 201);
  });
}
