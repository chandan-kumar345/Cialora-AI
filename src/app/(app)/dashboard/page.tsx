import React from "react";
import { requireAuthContext } from "@/lib/auth";
import { getCampaignOverview, getPerformanceAnalytics } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await requireAuthContext();

  const [performance, overview, recentCampaigns] = await Promise.all([
    getPerformanceAnalytics(user.id, "30d"),
    getCampaignOverview(user.id),
    prisma.campaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <DashboardClient
      initialPerformance={performance}
      initialOverview={overview}
      initialCampaigns={recentCampaigns.map((c) => ({
        ...c,
        scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
