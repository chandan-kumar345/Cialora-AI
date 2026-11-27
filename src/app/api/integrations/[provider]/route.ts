import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import {
  extractRequestMeta,
  withProtectedRoute,
  writeAuditLog,
} from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";
import {
  INTEGRATION_PROVIDERS,
  integrationUpsertSchema,
} from "@/lib/validation";

type RouteParams = { params: Promise<{ provider: string }> };

function isValidProvider(
  value: string
): value is (typeof INTEGRATION_PROVIDERS)[number] {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { provider } = await context.params;
    const normalized = provider.toUpperCase();
    if (!isValidProvider(normalized)) {
      return apiError("Unsupported integration provider.", 400);
    }

    const body = await request.json();
    const data = integrationUpsertSchema.parse(body);

    const secretPayload = JSON.stringify({
      apiKey: data.apiKey,
      accountId: data.accountId ?? null,
      webhookUrl: data.webhookUrl ?? null,
    });

    const encryptedConfig = encryptSecret(secretPayload);
    const configPreview = maskSecret(data.apiKey);
    const now = new Date();

    const connection = await prisma.integrationConnection.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: normalized,
        },
      },
      update: {
        displayName: data.displayName,
        status: "CONNECTED",
        encryptedConfig,
        configPreview,
        lastSyncedAt: now,
      },
      create: {
        userId: user.id,
        provider: normalized,
        displayName: data.displayName,
        status: "CONNECTED",
        encryptedConfig,
        configPreview,
        lastSyncedAt: now,
      },
      select: {
        provider: true,
        displayName: true,
        status: true,
        configPreview: true,
        lastSyncedAt: true,
      },
    });

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "INTEGRATION_CONNECTED",
      entityType: "IntegrationConnection",
      entityId: normalized,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiOk({ integration: connection });
  });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { provider } = await context.params;
    const normalized = provider.toUpperCase();
    if (!isValidProvider(normalized)) {
      return apiError("Unsupported integration provider.", 400);
    }

    const existing = await prisma.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: normalized,
        },
      },
    });

    if (!existing) {
      return apiError("Integration connection not found.", 404);
    }

    const updated = await prisma.integrationConnection.update({
      where: { id: existing.id },
      data: {
        status: "CONNECTED",
        lastSyncedAt: new Date(),
      },
      select: {
        provider: true,
        displayName: true,
        status: true,
        configPreview: true,
        lastSyncedAt: true,
      },
    });

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "INTEGRATION_SYNCED",
      entityType: "IntegrationConnection",
      entityId: normalized,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiOk({ integration: updated });
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { provider } = await context.params;
    const normalized = provider.toUpperCase();
    if (!isValidProvider(normalized)) {
      return apiError("Unsupported integration provider.", 400);
    }

    const existing = await prisma.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: normalized,
        },
      },
    });

    if (!existing) {
      return apiError("Integration connection not found.", 404);
    }

    await prisma.integrationConnection.delete({
      where: { id: existing.id },
    });

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "INTEGRATION_DISCONNECTED",
      entityType: "IntegrationConnection",
      entityId: normalized,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiOk({ ok: true });
  });
}
