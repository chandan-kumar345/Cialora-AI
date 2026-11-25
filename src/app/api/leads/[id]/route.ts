import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";
import { leadUpdateSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const existing = await prisma.lead.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return apiError("Lead not found.", 404);

    const body = await request.json();
    const data = leadUpdateSchema.parse(body);

    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.email !== undefined ? { email: data.email ?? null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
        ...(data.company !== undefined ? { company: data.company ?? null } : {}),
        ...(data.country !== undefined ? { country: data.country ?? null } : {}),
        ...(data.sourceChannel !== undefined
          ? { sourceChannel: data.sourceChannel }
          : {}),
        ...(data.stage !== undefined ? { stage: data.stage } : {}),
        ...(data.estimatedValueCents !== undefined
          ? { estimatedValueCents: data.estimatedValueCents }
          : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
      },
    });

    return apiOk({ lead });
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const res = await prisma.lead.deleteMany({
      where: { id, userId: user.id },
    });
    if (res.count === 0) return apiError("Lead not found.", 404);
    return apiOk({ ok: true });
  });
}
