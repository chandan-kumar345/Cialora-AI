import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  extractRequestMeta,
  withProtectedRoute,
  writeAuditLog,
} from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";
import { campaignUpdateSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
      include: {
        metricsDaily: {
          orderBy: { date: "asc" },
          take: 90,
        },
      },
    });

    if (!campaign) {
      return apiError("Campaign not found.", 404);
    }

    return apiOk({ campaign });
  });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const existing = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return apiError("Campaign not found.", 404);
    }

    const body = await request.json();
    const data = campaignUpdateSchema.parse(body);
    const now = new Date();

    const updated = await prisma.campaign.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.channel !== undefined ? { channel: data.channel } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.mediaType !== undefined ? { mediaType: data.mediaType } : {}),
        ...(data.mediaType === "NONE"
          ? { mediaUrl: null }
          : data.mediaUrl !== undefined
            ? { mediaUrl: data.mediaUrl ?? null }
            : {}),
        ...(data.footerText !== undefined ? { footerText: data.footerText ?? null } : {}),
        ...(data.actions !== undefined
          ? {
              actionsJson:
                data.actions.length > 0 ? JSON.stringify(data.actions) : null,
            }
          : {}),
        ...(data.status !== undefined
          ? {
              status: data.status,
              startedAt:
                data.status === "ACTIVE" && !existing.startedAt
                  ? now
                  : existing.startedAt,
              completedAt:
                data.status === "COMPLETED" ? now : existing.completedAt,
            }
          : {}),
        ...(data.budgetCents !== undefined ? { budgetCents: data.budgetCents } : {}),
        ...(data.scheduledAt !== undefined
          ? { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }
          : {}),
      },
    });

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "CAMPAIGN_UPDATED",
      entityType: "Campaign",
      entityId: updated.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiOk({ campaign: updated });
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const result = await prisma.campaign.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      return apiError("Campaign not found.", 404);
    }

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "CAMPAIGN_DELETED",
      entityType: "Campaign",
      entityId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiOk({ ok: true });
  });
}
