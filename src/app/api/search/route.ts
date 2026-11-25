import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q || q.length < 1) {
      return apiOk({
        campaigns: [],
        leads: [],
        socialPosts: [],
        adCampaigns: [],
      });
    }

    const [campaigns, leads, socialPosts, adCampaigns] = await Promise.all([
      prisma.campaign.findMany({
        where: {
          userId: user.id,
          OR: [{ name: { contains: q } }, { channel: { contains: q } }],
        },
        select: { id: true, name: true, channel: true, status: true },
        take: 5,
      }),
      prisma.lead.findMany({
        where: {
          userId: user.id,
          OR: [
            { fullName: { contains: q } },
            { email: { contains: q } },
            { company: { contains: q } },
          ],
        },
        select: { id: true, fullName: true, email: true, stage: true },
        take: 5,
      }),
      prisma.socialPost.findMany({
        where: {
          userId: user.id,
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
        select: { id: true, title: true, platform: true, status: true },
        take: 5,
      }),
      prisma.adCampaign.findMany({
        where: {
          userId: user.id,
          OR: [{ name: { contains: q } }, { platform: { contains: q } }],
        },
        select: { id: true, name: true, platform: true, status: true },
        take: 5,
      }),
    ]);

    return apiOk({ campaigns, leads, socialPosts, adCampaigns });
  });
}
