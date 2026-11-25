import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { getWorkspaceReport } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/format";
import { apiOk } from "@/lib/security";
import { aiAssistantSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const body = await request.json();
    const { prompt } = aiAssistantSchema.parse(body);

    const [report, topCampaigns, activeAutomations] = await Promise.all([
      getWorkspaceReport(user.id, "30d"),
      prisma.campaign.findMany({
        where: { userId: user.id },
        orderBy: { revenueCents: "desc" },
        take: 3,
      }),
      prisma.automationWorkflow.count({
        where: { userId: user.id, isActive: true },
      }),
    ]);

    const { totals } = report.performance;
    const summarySnapshot = {
      workspace: user.workspaceName,
      currency: user.currency,
      campaignsTotal: report.overview.total,
      activeCampaigns: report.overview.active,
      sentLast30d: totals.sent,
      deliveryRatePct: totals.deliveryRate,
      clicksLast30d: totals.clicks,
      leadsLast30d: totals.leads,
      revenueLast30dFormatted: formatCurrency(
        totals.revenueCents,
        user.currency,
        user.locale
      ),
      crmLeadsTotal: report.totalLeads,
      activeAutomations,
      topCampaigns: topCampaigns.map((c) => ({
        name: c.name,
        channel: c.channel,
        status: c.status,
        sent: c.sentCount,
        clicks: c.clickCount,
        leads: c.leadCount,
      })),
    };

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: [
                        `You are Cielora AI Assistant for workspace "${user.workspaceName}".`,
                        `Analyze ONLY the real workspace snapshot below. Never invent metrics.`,
                        `Workspace Snapshot: ${JSON.stringify(summarySnapshot)}`,
                        `User Prompt: ${prompt}`,
                      ].join("\n\n"),
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (reply) {
            return apiOk({
              source: "gemini",
              reply,
              snapshot: summarySnapshot,
            });
          }
        }
      } catch {
        // Gracefully fall back to deterministic workspace telemetry analyzer
      }
    }

    const suggestions: string[] = [];
    if (report.overview.total === 0) {
      suggestions.push(
        `Your workspace "${user.workspaceName}" currently has 0 campaigns. Start by creating your first WhatsApp, Email, or Paid Ads campaign in Campaigns to begin tracking real telemetry.`
      );
      suggestions.push(
        `Add your initial prospects to Leads CRM (or connect WhatsApp Cloud API / SendGrid in Integrations) so Bulk Messaging can target segmented audiences.`
      );
    } else {
      suggestions.push(
        `Last 30 days telemetry across ${formatNumber(report.overview.total, user.locale)} campaigns: ${formatNumber(totals.sent, user.locale)} sent, ${totals.deliveryRate}% delivered, ${formatNumber(totals.clicks, user.locale)} clicks, ${formatNumber(totals.leads, user.locale)} leads, and ${summarySnapshot.revenueLast30dFormatted} attributed revenue.`
      );
      if (totals.sent > 0 && totals.deliveryRate < 90) {
        suggestions.push(
          `Delivery rate is ${totals.deliveryRate}%. Clean invalid E.164 contacts in Leads CRM and verify sender credentials under Integrations to improve deliverability.`
        );
      }
      if (report.overview.drafts > 0) {
        suggestions.push(
          `You have ${report.overview.drafts} draft campaign(s) ready for launch. Review and activate them to expand your reach.`
        );
      }
      if (activeAutomations === 0 && report.totalLeads > 0) {
        suggestions.push(
          `You have ${report.totalLeads} lead(s) in CRM but 0 active automations. Set up a "Lead Created" workflow in Automation to respond within seconds.`
        );
      }
      if (topCampaigns.length > 0) {
        const best = topCampaigns[0];
        suggestions.push(
          `Top performing campaign: "${best.name}" (${best.channel}) with ${formatNumber(best.leadCount, user.locale)} leads.`
        );
      }
    }

    const lower = prompt.toLowerCase();
    if (lower.includes("whatsapp") || lower.includes("copy") || lower.includes("template") || lower.includes("campaign")) {
      suggestions.push(
        `Suggested campaign structure for "${prompt.slice(0, 80)}":\n• Channel: WhatsApp / Email omnichannel sequence\n• Hook: Personalize with recipient first name and clear localized offer in ${user.currency}\n• CTA: Single tracked link + automated follow-up in Automation after 24h.`
      );
    }

    return apiOk({
      source: "telemetry-analyzer",
      reply: suggestions.join("\n\n"),
      snapshot: summarySnapshot,
    });
  });
}
