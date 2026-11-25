import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";
import { socialPostCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const status = request.nextUrl.searchParams.get("status")?.trim();
    const posts = await prisma.socialPost.findMany({
      where: {
        userId: user.id,
        ...(status && status !== "ALL" ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return apiOk({ posts });
  });
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = socialPostCreateSchema.parse(body);
    const now = new Date();

    const post = await prisma.socialPost.create({
      data: {
        userId: user.id,
        platform: data.platform,
        title: data.title,
        content: data.content,
        mediaUrl: data.mediaUrl ?? null,
        status: data.status,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        publishedAt: data.status === "PUBLISHED" ? now : null,
      },
    });

    return apiOk({ post }, 201);
  });
}
