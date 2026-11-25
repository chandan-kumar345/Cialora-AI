"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  Layers,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { BotEmblem } from "@/components/BrandArtwork";
import {
  CampaignDonutChart,
  PerformanceSeriesPoint,
  PerformanceSplineChart,
} from "@/components/PerformanceCharts";
import {
  CampaignDetailModal,
  CampaignRecord,
  CreateCampaignModal,
  RecordTelemetryModal,
} from "@/components/CampaignModals";
import { ChannelBadge, StatusBadge, TypeBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getCurrencyMeta,
} from "@/lib/format";

interface PerformancePayload {
  range: string;
  days: number;
  hasData: boolean;
  totals: {
    sent: number;
    delivered: number;
    deliveryRate: number;
    clicks: number;
    leads: number;
    revenueCents: number;
  };
  deltas: {
    sentPct: number | null;
    clicksPct: number | null;
    leadsPct: number | null;
    revenuePct: number | null;
  };
  series: PerformanceSeriesPoint[];
}

interface OverviewPayload {
  total: number;
  active: number;
  scheduled: number;
  completed: number;
  drafts: number;
}

const QUICK_MODULES = [
  {
    title: "Campaigns",
    desc: "Create & manage marketing campaigns",
    href: "/campaigns",
    icon: Megaphone,
    bg: "from-[#F5F2FF] to-white border-[#EAE4FF]",
    iconBg: "bg-[#EAE2FF] text-[#7C3AED]",
  },
  {
    title: "Social Marketing",
    desc: "Plan, publish & track social media content",
    href: "/social",
    icon: Layers,
    bg: "from-[#FFF1F6] to-white border-[#FDE2EE]",
    iconBg: "bg-[#FCE7F3] text-[#EC4899]",
  },
  {
    title: "Ads Manager",
    desc: "Run & optimize paid ads (Meta, Google)",
    href: "/ads",
    icon: BarChart2,
    bg: "from-[#EEFCF4] to-white border-[#DCFCE7]",
    iconBg: "bg-[#DCFCE7] text-[#16A34A]",
  },
  {
    title: "Bulk Messaging",
    desc: "Send WhatsApp, SMS & Email in bulk",
    href: "/messaging",
    icon: MessageSquare,
    bg: "from-[#EFF7FF] to-white border-[#DCEEFF]",
    iconBg: "bg-[#E0F2FE] text-[#0284C7]",
  },
  {
    title: "Leads CRM",
    desc: "Capture, manage & convert your leads",
    href: "/leads",
    icon: Users,
    bg: "from-[#FFF8EB] to-white border-[#FEF0D1]",
    iconBg: "bg-[#FEF3C7] text-[#D97706]",
  },
  {
    title: "Automation",
    desc: "Set up auto messages & customer journeys",
    href: "/automation",
    icon: Zap,
    bg: "from-[#F6F1FF] to-white border-[#ECE2FF]",
    iconBg: "bg-[#EDE9FE] text-[#7C3AED]",
  },
];

export function DashboardClient({
  initialPerformance,
  initialOverview,
  initialCampaigns,
}: {
  initialPerformance: PerformancePayload;
  initialOverview: OverviewPayload;
  initialCampaigns: CampaignRecord[];
}) {
  const { user, openAiAssistant } = useWorkspace();
  const [range, setRange] = useState(initialPerformance.range || "30d");
  const [performance, setPerformance] = useState<PerformancePayload>(initialPerformance);
  const [overview, setOverview] = useState<OverviewPayload>(initialOverview);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(initialCampaigns);
  const [loadingPerf, setLoadingPerf] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<CampaignRecord | null>(null);
  const [telemetryCampaign, setTelemetryCampaign] = useState<CampaignRecord | null>(null);

  const refreshAll = useCallback(
    async (selectedRange = range) => {
      setLoadingPerf(true);
      try {
        const [perfRes, ovRes, campRes] = await Promise.all([
          fetch(`/api/analytics/performance?range=${selectedRange}`, {
            cache: "no-store",
          }),
          fetch("/api/analytics/overview", { cache: "no-store" }),
          fetch("/api/campaigns?limit=5", { cache: "no-store" }),
        ]);

        if (perfRes.ok) setPerformance(await perfRes.json());
        if (ovRes.ok) setOverview(await ovRes.json());
        if (campRes.ok) {
          const cData = await campRes.json();
          setCampaigns(cData.campaigns ?? []);
        }
      } finally {
        setLoadingPerf(false);
      }
    },
    [range]
  );

  useEffect(() => {
    refreshAll(range);
  }, [range, refreshAll]);

  const handleDeleteCampaign = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      refreshAll(range);
    }
  };

  const currencyMeta = getCurrencyMeta(user.currency);

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "0%";
    const prefix = delta > 0 ? "↑ " : delta < 0 ? "↓ " : "";
    return `${prefix}${Math.abs(delta)}%`;
  };

  const kpiCards = [
    {
      label: "Messages Sent",
      value: formatNumber(performance.totals.sent, user.locale),
      sub: formatDelta(performance.deltas.sentPct),
      subTone:
        (performance.deltas.sentPct ?? 0) >= 0
          ? "text-emerald-600"
          : "text-rose-600",
      cardBg: "bg-[#F6F4FF] border-[#EAE4FF]",
      iconBg: "bg-white text-violet-600 shadow-xs",
      icon: Send,
    },
    {
      label: "Delivered",
      value: formatNumber(performance.totals.delivered, user.locale),
      sub: `${performance.totals.deliveryRate}%`,
      subTone: "text-emerald-600",
      cardBg: "bg-[#ECFDF4] border-[#D3F8E3]",
      iconBg: "bg-[#16A34A] text-white",
      icon: CheckCircle2,
    },
    {
      label: "Clicks",
      value: formatNumber(performance.totals.clicks, user.locale),
      sub: formatDelta(performance.deltas.clicksPct),
      subTone:
        (performance.deltas.clicksPct ?? 0) >= 0
          ? "text-emerald-600"
          : "text-rose-600",
      cardBg: "bg-[#F4F5FF] border-[#E3E6FF]",
      iconBg: "bg-white text-indigo-600 shadow-xs",
      icon: MousePointerClick,
    },
    {
      label: "Leads",
      value: formatNumber(performance.totals.leads, user.locale),
      sub: formatDelta(performance.deltas.leadsPct),
      subTone:
        (performance.deltas.leadsPct ?? 0) >= 0
          ? "text-emerald-600"
          : "text-rose-600",
      cardBg: "bg-[#FFF9ED] border-[#FDECC8]",
      iconBg: "bg-white text-amber-600 shadow-xs",
      icon: Users,
    },
    {
      label: "Revenue",
      value: formatCurrency(
        performance.totals.revenueCents,
        user.currency,
        user.locale
      ),
      sub: formatDelta(performance.deltas.revenuePct),
      subTone:
        (performance.deltas.revenuePct ?? 0) >= 0
          ? "text-emerald-600"
          : "text-rose-600",
      cardBg: "bg-[#FFF4EC] border-[#FEE2CD]",
      iconBg: "bg-[#F59E0B] text-white",
      currencyBadge: currencyMeta.symbol,
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Cosmic Hero Banner matching Image 3 */}
      <section className="cielora-hero-bg relative overflow-hidden rounded-[22px] px-6 py-6 text-white shadow-[0_18px_48px_-14px_rgba(27,15,58,0.5)] sm:px-8 sm:py-7">
        {/* Seamless 3D Cosmic Illustration on Right */}
        <img
          src="/images/hero-cosmic-3d.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[66%] object-cover object-center md:block"
        />
        <div
          className="pointer-events-none absolute inset-0 hidden md:block bg-gradient-to-r from-[#180A36] via-[#261052]/95 to-transparent"
          style={{ width: "68%" }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-purple-100 backdrop-blur">
            <span>AI-Powered Marketing Suite</span>
            <Sparkles className="h-3 w-3 text-amber-300" />
          </span>

          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[32px] sm:leading-[1.15]">
            Run Smarter Campaigns,
            <span className="block bg-gradient-to-r from-[#FBBF24] via-[#F472B6] to-[#C084FC] bg-clip-text text-transparent">
              Grow Your Business
            </span>
          </h2>

          <p className="mt-2.5 text-[13px] leading-relaxed text-purple-100/85">
            Create, automate and track marketing campaigns across WhatsApp, SMS,
            Email, Social Media and Paid Ads — all in one place.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="cielora-upgrade-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white transition"
            >
              <span>Create Campaign</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setFeaturesOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#190C36]/70 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              <span>Explore Features</span>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. 6 Quick Action Cards Row matching Image 3 */}
      <section aria-label="Quick module shortcuts">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
          {QUICK_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                href={mod.href}
                className={`group rounded-2xl border bg-gradient-to-b ${mod.bg} p-4 shadow-[0_4px_18px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${mod.iconBg}`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
                </div>
                <h3 className="mt-3 text-[13.5px] font-bold text-slate-900">
                  {mod.title}
                </h3>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  {mod.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Main Analytics Grid matching Image 3 */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Marketing Performance Card */}
        <div className="xl:col-span-8 rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_6px_26px_rgba(15,23,42,0.03)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <BarChart2 className="h-4 w-4" />
              </span>
              <h2 className="text-[15.5px] font-bold text-slate-900">
                Marketing Performance
              </h2>
              {loadingPerf && (
                <span className="text-[11px] font-medium text-violet-600">
                  Syncing...
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-500" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                aria-label="Analytics time range"
                className="appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs font-semibold text-slate-700 focus:border-violet-500 focus:outline-none"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">This Year</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`rounded-2xl border p-3.5 ${card.cardBg}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${card.iconBg}`}
                    >
                      {card.currencyBadge ? (
                        card.currencyBadge
                      ) : Icon ? (
                        <Icon className="h-3.5 w-3.5" />
                      ) : null}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 leading-tight">
                      {card.label}
                    </span>
                  </div>
                  <div className="mt-2 text-[17px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                    {card.value}
                  </div>
                  <div className={`mt-0.5 text-[11px] font-semibold ${card.subTone}`}>
                    {card.sub}
                  </div>
                </div>
              );
            })}
          </div>

          <PerformanceSplineChart
            series={performance.series}
            hasData={performance.hasData}
            locale={user.locale}
            timezone={user.timezone}
          />
        </div>

        {/* Right Stack */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Campaign Overview Donut */}
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_6px_26px_rgba(15,23,42,0.03)] sm:p-6">
            <div className="flex items-center gap-2.5">
              <BotEmblem size="sm" />
              <h2 className="text-[15.5px] font-bold text-slate-900">
                Campaign Overview
              </h2>
            </div>

            <CampaignDonutChart overview={overview} locale={user.locale} />
          </div>

          {/* Cielora AI Assistant Card */}
          <div className="cielora-ai-card flex flex-1 flex-col justify-between rounded-[22px] border border-violet-100 p-5 shadow-[0_8px_28px_rgba(124,58,237,0.08)] sm:p-6">
            <div className="flex items-center gap-4">
              <BotEmblem size="md" />
              <div>
                <h2 className="text-[15.5px] font-bold text-slate-900">
                  Cielora AI Assistant
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Get smart suggestions, optimize campaigns, and grow faster
                  with AI.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openAiAssistant()}
              className="cielora-ai-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white transition"
            >
              <span>Ask Cielora AI</span>
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Recent Campaigns Table matching Image 3 */}
      <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_6px_26px_rgba(15,23,42,0.03)] sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="text-[15.5px] font-bold text-slate-900">
              Recent Campaigns
            </h2>
          </div>

          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:text-violet-800"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-9 text-center">
            <p className="text-sm font-bold text-slate-800">
              Your workspace has no campaigns yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              No dummy data is preloaded into your account. Create your first
              real campaign to start tracking deliveries, clicks, leads, and
              revenue in {user.currency}.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="cielora-gradient-btn mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white"
            >
              <span>Create First Campaign</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 pr-4">Campaign Name</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Sent</th>
                  <th className="py-3 px-3 text-right">Delivered</th>
                  <th className="py-3 px-3 text-right">Clicks</th>
                  <th className="py-3 px-3 text-right">Leads</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp) => {
                  const delPct =
                    camp.sentCount > 0
                      ? Math.round((camp.deliveredCount / camp.sentCount) * 1000) /
                        10
                      : 0;
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[11px] font-bold text-white shadow-xs">
                            {camp.channel.slice(0, 2)}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">
                              {camp.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Created on{" "}
                              {formatDate(
                                camp.createdAt,
                                user.timezone,
                                user.locale
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <ChannelBadge channel={camp.channel} />
                      </td>
                      <td className="py-3.5 px-3">
                        <TypeBadge type={camp.type} />
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {camp.sentCount > 0
                          ? formatNumber(camp.sentCount, user.locale)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        {camp.deliveredCount > 0 ? (
                          <div>
                            <div className="font-semibold text-slate-800">
                              {formatNumber(camp.deliveredCount, user.locale)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ({delPct}%)
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {formatNumber(camp.clickCount, user.locale)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {formatNumber(camp.leadCount, user.locale)}
                      </td>
                      <td className="py-3.5 px-3">
                        <StatusBadge status={camp.status} />
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="View campaign details"
                            onClick={() => setDetailCampaign(camp)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Record telemetry event"
                            onClick={() => setTelemetryCampaign(camp)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                          >
                            <Activity className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete campaign"
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateCampaignModal
        open={createOpen}
        currency={user.currency}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refreshAll(range)}
      />

      <RecordTelemetryModal
        campaign={telemetryCampaign}
        currency={user.currency}
        onClose={() => setTelemetryCampaign(null)}
        onRecorded={() => refreshAll(range)}
      />

      <CampaignDetailModal
        campaign={detailCampaign}
        currency={user.currency}
        locale={user.locale}
        timezone={user.timezone}
        onClose={() => setDetailCampaign(null)}
      />

      {featuresOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setFeaturesOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cielora AI Global Suite Modules
                </h2>
                <p className="text-xs text-slate-500">
                  Every module below operates on live APIs isolated to{" "}
                  <span className="font-semibold text-violet-600">
                    {user.workspaceName}
                  </span>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeaturesOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {QUICK_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.title}
                    href={mod.href}
                    onClick={() => setFeaturesOpen(false)}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 p-3.5 hover:border-violet-300 hover:bg-violet-50/40"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${mod.iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {mod.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {mod.desc}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
