import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";
import { adCampaignCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const platform = request.nextUrl.searchParams.get("platform")?.trim();
    const ads = await prisma.adCampaign.findMany({
      where: {
        userId: user.id,
        ...(platform && platform !== "ALL" ? { platform } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return apiOk({ ads });
  });
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const data = adCampaignCreateSchema.parse(body);

    const ad = await prisma.adCampaign.create({
      data: {
        userId: user.id,
        name: data.name,
        platform: data.platform,
        objective: data.objective,
        status: data.status,
        dailyBudgetCents: data.dailyBudgetCents,
        spendCents: data.spendCents,
        impressionsCount: data.impressionsCount,
        clicksCount: data.clicksCount,
        conversionsCount: data.conversionsCount,
        revenueCents: data.revenueCents,
        startDate: data.status === "ACTIVE" ? new Date() : null,
      },
    });

    return apiOk({ ad }, 201);
  });
}
