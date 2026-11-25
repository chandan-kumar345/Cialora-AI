import { prisma } from "@/lib/db";

export type AnalyticsRange = "7d" | "30d" | "90d" | "1y";

export function parseRangeDays(raw: string | null | undefined): {
  range: AnalyticsRange;
  days: number;
} {
  switch (raw) {
    case "7d":
      return { range: "7d", days: 7 };
    case "90d":
      return { range: "90d", days: 90 };
    case "1y":
      return { range: "1y", days: 365 };
    case "30d":
    default:
      return { range: "30d", days: 30 };
  }
}

export function utcMidnight(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calcGrowthPct(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getPerformanceAnalytics(
  userId: string,
  rawRange?: string | null
) {
  const { range, days } = parseRangeDays(rawRange);
  const todayUtc = utcMidnight(new Date());
  const currentStart = addUtcDays(todayUtc, -(days - 1));
  const previousStart = addUtcDays(currentStart, -days);

  const rows = await prisma.campaignMetricDaily.findMany({
    where: {
      userId,
      date: {
        gte: previousStart,
        lte: todayUtc,
      },
    },
    orderBy: { date: "asc" },
  });

  const currentByDay = new Map<
    string,
    { sent: number; delivered: number; clicks: number; leads: number; revenueCents: number }
  >();

  let curSent = 0;
  let curDelivered = 0;
  let curClicks = 0;
  let curLeads = 0;
  let curRevenueCents = 0;

  let prevSent = 0;
  let prevClicks = 0;
  let prevLeads = 0;
  let prevRevenueCents = 0;

  for (const row of rows) {
    if (row.date >= currentStart) {
      curSent += row.sentCount;
      curDelivered += row.deliveredCount;
      curClicks += row.clickCount;
      curLeads += row.leadCount;
      curRevenueCents += row.revenueCents;

      const key = toIsoDay(row.date);
      const prev = currentByDay.get(key) ?? {
        sent: 0,
        delivered: 0,
        clicks: 0,
        leads: 0,
        revenueCents: 0,
      };
      prev.sent += row.sentCount;
      prev.delivered += row.deliveredCount;
      prev.clicks += row.clickCount;
      prev.leads += row.leadCount;
      prev.revenueCents += row.revenueCents;
      currentByDay.set(key, prev);
    } else {
      prevSent += row.sentCount;
      prevClicks += row.clickCount;
      prevLeads += row.leadCount;
      prevRevenueCents += row.revenueCents;
    }
  }

  const series: Array<{
    date: string;
    sent: number;
    delivered: number;
    clicks: number;
    leads: number;
    revenueCents: number;
  }> = [];

  for (let i = 0; i < days; i++) {
    const day = addUtcDays(currentStart, i);
    const key = toIsoDay(day);
    const bucket = currentByDay.get(key);
    series.push({
      date: key,
      sent: bucket?.sent ?? 0,
      delivered: bucket?.delivered ?? 0,
      clicks: bucket?.clicks ?? 0,
      leads: bucket?.leads ?? 0,
      revenueCents: bucket?.revenueCents ?? 0,
    });
  }

  const deliveryRate =
    curSent > 0 ? Math.round((curDelivered / curSent) * 1000) / 10 : 0;

  return {
    range,
    days,
    hasData: curSent > 0 || curDelivered > 0 || curClicks > 0 || curLeads > 0 || curRevenueCents > 0,
    totals: {
      sent: curSent,
      delivered: curDelivered,
      deliveryRate,
      clicks: curClicks,
      leads: curLeads,
      revenueCents: curRevenueCents,
    },
    deltas: {
      sentPct: calcGrowthPct(curSent, prevSent),
      clicksPct: calcGrowthPct(curClicks, prevClicks),
      leadsPct: calcGrowthPct(curLeads, prevLeads),
      revenuePct: calcGrowthPct(curRevenueCents, prevRevenueCents),
    },
    series,
  };
}

export async function getCampaignOverview(userId: string) {
  const grouped = await prisma.campaign.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });

  const counts = {
    total: 0,
    active: 0,
    scheduled: 0,
    completed: 0,
    drafts: 0,
    paused: 0,
  };

  for (const item of grouped) {
    const c = item._count._all;
    counts.total += c;
    switch (item.status) {
      case "ACTIVE":
        counts.active += c;
        break;
      case "SCHEDULED":
        counts.scheduled += c;
        break;
      case "COMPLETED":
        counts.completed += c;
        break;
      case "PAUSED":
        counts.paused += c;
        break;
      case "DRAFT":
      default:
        counts.drafts += c;
        break;
    }
  }

  return counts;
}

export async function getWorkspaceReport(
  userId: string,
  rawRange?: string | null
) {
  const [performance, overview, campaigns, adCampaigns, leads, socialPosts, bulkMessages] =
    await Promise.all([
      getPerformanceAnalytics(userId, rawRange),
      getCampaignOverview(userId),
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.adCampaign.findMany({
        where: { userId },
      }),
      prisma.lead.findMany({
        where: { userId },
      }),
      prisma.socialPost.findMany({
        where: { userId },
      }),
      prisma.bulkMessage.findMany({
        where: { userId },
      }),
    ]);

  const byChannelMap = new Map<
    string,
    {
      channel: string;
      campaigns: number;
      sent: number;
      delivered: number;
      clicks: number;
      leads: number;
      revenueCents: number;
    }
  >();

  for (const c of campaigns) {
    const entry = byChannelMap.get(c.channel) ?? {
      channel: c.channel,
      campaigns: 0,
      sent: 0,
      delivered: 0,
      clicks: 0,
      leads: 0,
      revenueCents: 0,
    };
    entry.campaigns += 1;
    entry.sent += c.sentCount;
    entry.delivered += c.deliveredCount;
    entry.clicks += c.clickCount;
    entry.leads += c.leadCount;
    entry.revenueCents += c.revenueCents;
    byChannelMap.set(c.channel, entry);
  }

  const adsTotals = adCampaigns.reduce(
    (acc, a) => {
      acc.spendCents += a.spendCents;
      acc.impressions += a.impressionsCount;
      acc.clicks += a.clicksCount;
      acc.conversions += a.conversionsCount;
      acc.revenueCents += a.revenueCents;
      return acc;
    },
    { spendCents: 0, impressions: 0, clicks: 0, conversions: 0, revenueCents: 0 }
  );

  const leadsPipelineMap = new Map<string, { stage: string; count: number; valueCents: number }>();
  for (const stage of ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"]) {
    leadsPipelineMap.set(stage, { stage, count: 0, valueCents: 0 });
  }
  for (const l of leads) {
    const bucket = leadsPipelineMap.get(l.stage) ?? {
      stage: l.stage,
      count: 0,
      valueCents: 0,
    };
    bucket.count += 1;
    bucket.valueCents += l.estimatedValueCents;
    leadsPipelineMap.set(l.stage, bucket);
  }

  const socialReach = socialPosts.reduce((s, p) => s + p.reachCount, 0);
  const socialEngagements = socialPosts.reduce(
    (s, p) => s + p.likesCount + p.commentsCount + p.sharesCount,
    0
  );

  return {
    performance,
    overview,
    channelBreakdown: Array.from(byChannelMap.values()),
    adsSummary: {
      ...adsTotals,
      roas:
        adsTotals.spendCents > 0
          ? Math.round((adsTotals.revenueCents / adsTotals.spendCents) * 100) / 100
          : 0,
      ctr:
        adsTotals.impressions > 0
          ? Math.round((adsTotals.clicks / adsTotals.impressions) * 10000) / 100
          : 0,
    },
    leadsPipeline: Array.from(leadsPipelineMap.values()),
    totalLeads: leads.length,
    socialSummary: {
      totalPosts: socialPosts.length,
      publishedPosts: socialPosts.filter((p) => p.status === "PUBLISHED").length,
      totalReach: socialReach,
      totalEngagements: socialEngagements,
    },
    messagingSummary: {
      totalBroadcasts: bulkMessages.length,
      sentBroadcasts: bulkMessages.filter((m) => m.status === "SENT").length,
      totalRecipients: bulkMessages.reduce((s, m) => s + m.recipientCount, 0),
    },
  };
}
