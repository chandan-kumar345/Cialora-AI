"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { ChannelBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatCurrency, formatNumber } from "@/lib/format";

interface ReportPayload {
  performance: {
    range: string;
    totals: {
      sent: number;
      delivered: number;
      deliveryRate: number;
      clicks: number;
      leads: number;
      revenueCents: number;
    };
  };
  channelBreakdown: Array<{
    channel: string;
    campaigns: number;
    sent: number;
    delivered: number;
    clicks: number;
    leads: number;
    revenueCents: number;
  }>;
  adsSummary: {
    spendCents: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenueCents: number;
    roas: number;
    ctr: number;
  };
  leadsPipeline: Array<{
    stage: string;
    count: number;
    valueCents: number;
  }>;
  totalLeads: number;
  socialSummary: {
    totalPosts: number;
    publishedPosts: number;
    totalReach: number;
    totalEngagements: number;
  };
  messagingSummary: {
    totalBroadcasts: number;
    sentBroadcasts: number;
    totalRecipients: number;
  };
}

export default function ReportsPage() {
  const { user } = useWorkspace();
  const [range, setRange] = useState("30d");
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?range=${range}`, {
        cache: "no-store",
      });
      if (res.ok) setReport(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Reports &amp; Attribution
            </h1>
            <p className="text-xs text-slate-500">
              Cross-channel analytics computed dynamically in {user.currency} (
              {user.locale}).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">This Year</option>
          </select>
          <a
            href={`/api/reports/export?format=csv&range=${range}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </a>
          <a
            href={`/api/reports/export?format=json&range=${range}`}
            className="cielora-gradient-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </a>
        </div>
      </div>

      {loading || !report ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
          Compiling workspace report...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold text-slate-500">
                Attributed Campaign Revenue
              </div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                {formatCurrency(
                  report.performance.totals.revenueCents,
                  user.currency,
                  user.locale
                )}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Delivery rate: {report.performance.totals.deliveryRate}%
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold text-slate-500">
                Paid Ads Spend &amp; ROAS
              </div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                {formatCurrency(
                  report.adsSummary.spendCents,
                  user.currency,
                  user.locale
                )}
              </div>
              <div className="mt-1 text-xs text-emerald-600 font-semibold">
                ROAS: {report.adsSummary.roas}x · CTR: {report.adsSummary.ctr}%
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold text-slate-500">
                Social &amp; Bulk Broadcasts
              </div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                {formatNumber(report.socialSummary.publishedPosts, user.locale)}{" "}
                posts ·{" "}
                {formatNumber(report.messagingSummary.sentBroadcasts, user.locale)}{" "}
                sends
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Total CRM Leads:{" "}
                {formatNumber(report.totalLeads, user.locale)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">
                Channel Attribution Breakdown
              </h2>
              {report.channelBreakdown.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  No campaign telemetry recorded yet.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                        <th className="py-2.5">Channel</th>
                        <th className="py-2.5 text-right">Campaigns</th>
                        <th className="py-2.5 text-right">Sent</th>
                        <th className="py-2.5 text-right">Clicks</th>
                        <th className="py-2.5 text-right">Leads</th>
                        <th className="py-2.5 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.channelBreakdown.map((row) => (
                        <tr key={row.channel}>
                          <td className="py-2.5">
                            <ChannelBadge channel={row.channel} />
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {row.campaigns}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatNumber(row.sent, user.locale)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatNumber(row.clicks, user.locale)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatNumber(row.leads, user.locale)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                            {formatCurrency(
                              row.revenueCents,
                              user.currency,
                              user.locale
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">
                CRM Pipeline Stages
              </h2>
              <div className="mt-3 space-y-2.5 text-xs">
                {report.leadsPipeline.map((stage) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
                  >
                    <div>
                      <span className="font-bold text-slate-800">
                        {stage.stage}
                      </span>
                      <span className="ml-2 text-slate-500">
                        ({stage.count})
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatCurrency(
                        stage.valueCents,
                        user.currency,
                        user.locale
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
