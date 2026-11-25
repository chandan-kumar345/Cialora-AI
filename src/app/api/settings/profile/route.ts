import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  extractRequestMeta,
  withProtectedRoute,
  writeAuditLog,
} from "@/lib/auth";
import { apiOk } from "@/lib/security";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = profileUpdateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.workspaceName !== undefined
          ? { workspaceName: data.workspaceName }
          : {}),
        ...(data.country !== undefined
          ? { country: data.country.toUpperCase() }
          : {}),
        ...(data.currency !== undefined
          ? { currency: data.currency.toUpperCase() }
          : {}),
        ...(data.locale !== undefined ? { locale: data.locale } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
      },
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

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        currency: updated.currency,
        locale: updated.locale,
        timezone: updated.timezone,
      },
    });

    return apiOk({ user: updated });
  });
}
