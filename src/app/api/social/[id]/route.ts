import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/security";
import { socialPostUpdateSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const existing = await prisma.socialPost.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return apiError("Social post not found.", 404);

    const body = await request.json();
    const data = socialPostUpdateSchema.parse(body);

    const post = await prisma.socialPost.update({
      where: { id: existing.id },
      data: {
        ...(data.platform !== undefined ? { platform: data.platform } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.mediaUrl !== undefined ? { mediaUrl: data.mediaUrl ?? null } : {}),
        ...(data.status !== undefined
          ? {
              status: data.status,
              publishedAt:
                data.status === "PUBLISHED" && !existing.publishedAt
                  ? new Date()
                  : existing.publishedAt,
            }
          : {}),
        ...(data.scheduledAt !== undefined
          ? { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }
          : {}),
        ...(data.likesCount !== undefined ? { likesCount: data.likesCount } : {}),
        ...(data.commentsCount !== undefined ? { commentsCount: data.commentsCount } : {}),
        ...(data.sharesCount !== undefined ? { sharesCount: data.sharesCount } : {}),
        ...(data.reachCount !== undefined ? { reachCount: data.reachCount } : {}),
      },
    });

    return apiOk({ post });
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withProtectedRoute(request, async ({ user }) => {
    const { id } = await context.params;
    const res = await prisma.socialPost.deleteMany({
      where: { id, userId: user.id },
    });
    if (res.count === 0) return apiError("Social post not found.", 404);
    return apiOk({ ok: true });
  });
}
