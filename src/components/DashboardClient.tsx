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
  MoreHorizontal,
  MousePointerClick,
  Send,
  Sparkles,
  Target,
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

function AdsTriangleIcon({
  className = "h-[26px] w-[26px]",
}: {
  className?: string;
  strokeWidth?: number | string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <line
        x1="12"
        y1="5.2"
        x2="17.6"
        y2="17.6"
        stroke="#16A34A"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="5.2"
        x2="6.4"
        y2="17.6"
        stroke="#22C55E"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="6.4" cy="17.6" r="2.7" fill="#15803D" />
    </svg>
  );
}

const QUICK_MODULES = [
  {
    title: "Campaigns",
    desc: "Create & manage marketing campaigns",
    href: "/campaigns",
    icon: Megaphone,
    bg: "from-[#F3EEFF] via-[#FAF7FF] to-white border-[#E5DBFF]",
    iconBg:
      "bg-gradient-to-br from-[#EFE6FF] to-[#DFCEFF] text-[#7C3AED] ring-1 ring-[#D4BCFF]/80 shadow-[0_6px_14px_-4px_rgba(124,58,237,0.28)]",
  },
  {
    title: "Social Marketing",
    desc: "Plan, publish & track social media content",
    href: "/social",
    icon: Layers,
    bg: "from-[#FFEFF6] via-[#FFF7FA] to-white border-[#FBD7E8]",
    iconBg:
      "bg-gradient-to-br from-[#FCE7F3] to-[#FAD1E6] text-[#DB2777] ring-1 ring-[#F7B5D5]/80 shadow-[0_6px_14px_-4px_rgba(236,72,153,0.26)]",
  },
  {
    title: "Ads Manager",
    desc: "Run & optimize paid ads (Meta, Google)",
    href: "/ads",
    icon: AdsTriangleIcon,
    bg: "from-[#E9FDF1] via-[#F4FEF8] to-white border-[#C8F5DB]",
    iconBg:
      "bg-gradient-to-br from-[#DCFCE7] to-[#BEF7D3] text-[#16A34A] ring-1 ring-[#8CEAB0]/80 shadow-[0_6px_14px_-4px_rgba(22,163,74,0.24)]",
  },
  {
    title: "Bulk Messaging",
    desc: "Send WhatsApp, SMS & Email in bulk",
    href: "/messaging",
    icon: MessageSquare,
    bg: "from-[#EBF6FF] via-[#F5FAFF] to-white border-[#CFE9FF]",
    iconBg:
      "bg-gradient-to-br from-[#E0F2FE] to-[#C2E6FD] text-[#0284C7] ring-1 ring-[#8CD4FC]/80 shadow-[0_6px_14px_-4px_rgba(2,132,199,0.24)]",
  },
  {
    title: "Leads CRM",
    desc: "Capture, manage & convert your leads",
    href: "/leads",
    icon: Users,
    bg: "from-[#FFF4E5] via-[#FFFAF2] to-white border-[#FCE2BA]",
    iconBg:
      "bg-gradient-to-br from-[#FEF3C7] to-[#FDE29A] text-[#D97706] ring-1 ring-[#FCD06B]/80 shadow-[0_6px_14px_-4px_rgba(217,119,6,0.24)]",
  },
  {
    title: "Automation",
    desc: "Set up auto messages & customer journeys",
    href: "/automation",
    icon: Zap,
    bg: "from-[#F5EEFF] via-[#FAF7FF] to-white border-[#E4D7FF]",
    iconBg:
      "bg-gradient-to-br from-[#EDE9FE] to-[#D9CEFD] text-[#6D28D9] ring-1 ring-[#C3B1FC]/80 shadow-[0_6px_14px_-4px_rgba(109,40,217,0.26)]",
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
  const [performance, setPerformance] =
    useState<PerformancePayload>(initialPerformance);
  const [overview, setOverview] = useState<OverviewPayload>(initialOverview);
  const [campaigns, setCampaigns] =
    useState<CampaignRecord[]>(initialCampaigns);
  const [loadingPerf, setLoadingPerf] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] =
    useState<CampaignRecord | null>(null);
  const [telemetryCampaign, setTelemetryCampaign] =
    useState<CampaignRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    setOpenMenuId(null);
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      refreshAll(range);
    }
  };

  const currencyMeta = getCurrencyMeta(user.currency);

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "0%";
    const prefix = delta > 0 ? "↑ +" : delta < 0 ? "↓ " : "";
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
      cardBg: "bg-[#F5F2FF] border-[#E7E0FF]",
      iconBg: "bg-white text-violet-600 ring-1 ring-violet-200/80 shadow-xs",
      icon: Send,
    },
    {
      label: "Delivered",
      value: formatNumber(performance.totals.delivered, user.locale),
      sub: `${performance.totals.deliveryRate}%`,
      subTone: "text-emerald-600",
      cardBg: "bg-[#ECFCF3] border-[#CFF7E0]",
      iconBg: "bg-[#16A34A] text-white shadow-sm",
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
      cardBg: "bg-[#F2F5FF] border-[#DEE5FF]",
      iconBg: "bg-white text-indigo-600 ring-1 ring-indigo-200/80 shadow-xs",
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
      cardBg: "bg-[#FFF8EB] border-[#FDE9C2]",
      iconBg: "bg-white text-amber-600 ring-1 ring-amber-200/80 shadow-xs",
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
      cardBg: "bg-[#FFF3E8] border-[#FEDFC5]",
      iconBg: "bg-[#F59E0B] text-white shadow-sm",
      currencyBadge: currencyMeta.symbol,
    },
  ];

  return (
    <div className="space-y-3.5">
      {/* 1. Hero Banner in clean purple & white shades */}
      <section className="cielora-hero-bg relative overflow-hidden rounded-[22px] border border-violet-200/80 px-6 py-4 text-slate-900 shadow-[0_14px_38px_-14px_rgba(124,58,237,0.2)] sm:px-7">
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-[530px] py-0.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/90 px-3.5 py-1 text-[11px] font-semibold text-[#6D28D9] shadow-xs backdrop-blur">
              <span>AI-Powered Marketing Suite</span>
              <Sparkles className="h-4 w-4 text-[#7C3AED]" />
            </span>

            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-[#160C2E] sm:text-[31px] sm:leading-[1.12]">
              Run Smarter Campaigns,
              <span className="block bg-gradient-to-r from-[#5B21B6] via-[#7C3AED] to-[#9333EA] bg-clip-text text-transparent">
                Grow Your Business
              </span>
            </h2>

            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
              Create, automate and track marketing campaigns across WhatsApp,
              SMS, Email, Social Media and Paid Ads — all in one place.
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="cielora-ai-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white transition"
              >
                <span>Create Campaign</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => setFeaturesOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-5 py-2.5 text-xs font-semibold text-[#4C1D95] shadow-xs transition hover:bg-white"
              >
                <span>Explore Features</span>
                <LayoutGrid className="h-4 w-4 text-[#7C3AED]" />
              </button>
            </div>
          </div>

          <div className="hidden md:flex shrink-0 items-center justify-end md:w-[44%] lg:w-[46%]">
            <img
              src="/images/hero-showcase-3d.png"
              alt="Cielora AI omnichannel marketing suite"
              className="h-[200px] lg:h-[220px] w-auto max-w-full object-contain drop-shadow-[0_14px_28px_rgba(109,40,217,0.18)] select-none"
            />
          </div>
        </div>
      </section>

      {/* 2. 6 Quick Action Cards Row */}
      <section aria-label="Quick module shortcuts">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105 ${mod.iconBg}`}
                  >
                    <Icon className="h-[26px] w-[26px]" strokeWidth={2} />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-slate-400 ring-1 ring-slate-200/70 transition group-hover:bg-violet-600 group-hover:text-white group-hover:ring-violet-600">
                    <ChevronRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={2.2}
                    />
                  </span>
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

      {/* 3. Row 1: Marketing Performance (8 cols) + Campaign Overview (4 cols) */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 items-stretch">
        {/* Marketing Performance Card */}
        <div className="xl:col-span-8 rounded-[22px] border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-[0_6px_26px_rgba(15,23,42,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-purple-100/80 text-[#7C3AED] shadow-xs">
                <BarChart2 className="h-5 w-5" strokeWidth={2} />
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

            <div className="relative">
              <button
                type="button"
                aria-label="Analytics time range"
                aria-expanded={rangeMenuOpen}
                onClick={() => setRangeMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:border-violet-500 focus:outline-none"
              >
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>
                  {range === "7d"
                    ? "Last 7 Days"
                    : range === "90d"
                      ? "Last 90 Days"
                      : range === "1y"
                        ? "This Year"
                        : "Last 30 Days"}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              {rangeMenuOpen && (
                <div className="absolute right-0 top-10 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {[
                    { value: "7d", label: "Last 7 Days" },
                    { value: "30d", label: "Last 30 Days" },
                    { value: "90d", label: "Last 90 Days" },
                    { value: "1y", label: "This Year" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setRange(opt.value);
                        setRangeMenuOpen(false);
                      }}
                      className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                        range === opt.value
                          ? "bg-violet-50 font-semibold text-violet-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5 Compact Horizontal KPI Cards matching reference image */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`flex items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 ${card.cardBg}`}
                >
                  <span
                    className={`flex h-9 w-9 2xl:h-10 2xl:w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${card.iconBg}`}
                  >
                    {card.currencyBadge ? (
                      card.currencyBadge
                    ) : Icon ? (
                      <Icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[10.5px] font-medium text-slate-600">
                      {card.label}
                    </div>
                    <div className="text-[15px] font-extrabold tracking-tight text-slate-900 tabular-nums leading-tight">
                      {card.value}
                    </div>
                    <div className={`text-[10px] font-bold ${card.subTone}`}>
                      {card.sub}
                    </div>
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

        {/* Campaign Overview Donut Card */}
        <div className="xl:col-span-4 flex flex-col justify-center rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_6px_26px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-purple-100/80 text-[#7C3AED] shadow-xs">
              <Target className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="text-[15.5px] font-bold text-slate-900">
              Campaign Overview
            </h2>
          </div>

          <div className="my-auto py-3">
            <CampaignDonutChart overview={overview} locale={user.locale} />
          </div>
        </div>
      </section>

      {/* 4. Row 2: Recent Campaigns (8 cols) + Cielora AI Assistant (4 cols) */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 items-stretch">
        {/* Recent Campaigns Table */}
        <div className="xl:col-span-8 rounded-[22px] border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-[0_6px_26px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-purple-100/80 text-[#7C3AED] shadow-xs">
                <Layers className="h-5 w-5" strokeWidth={2} />
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
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div className="mt-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-6 text-center">
              <p className="text-sm font-bold text-slate-800">
                Your workspace has no campaigns yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                No dummy data is preloaded into your account. Create your first
                real campaign to track deliveries, clicks, leads, and revenue in{" "}
                {user.currency}.
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="cielora-gradient-btn mt-3.5 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white"
              >
                <span>Create First Campaign</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[10.5px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-500">
                    <th className="py-2 pr-1.5">Campaign Name</th>
                    <th className="py-2 px-1">Channel</th>
                    <th className="py-2 px-1">Type</th>
                    <th className="py-2 px-1 text-right">Sent</th>
                    <th className="py-2 px-1 text-right">Delivered</th>
                    <th className="py-2 px-1 text-right">Clicks</th>
                    <th className="py-2 px-1 text-right">Leads</th>
                    <th className="py-2 px-1">Status</th>
                    <th className="py-2 pl-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((camp) => {
                    const delPct =
                      camp.sentCount > 0
                        ? Math.round(
                            (camp.deliveredCount / camp.sentCount) * 1000
                          ) / 10
                        : 0;
                    return (
                      <tr key={camp.id} className="hover:bg-slate-50/70">
                        <td className="py-2 pr-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[9px] font-bold text-white shadow-xs">
                              {camp.channel.slice(0, 2)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-bold text-slate-900 max-w-[118px]">
                                {camp.name}
                              </div>
                              <div className="text-[9.5px] text-slate-400 whitespace-nowrap">
                                {formatDate(
                                  camp.createdAt,
                                  user.timezone,
                                  user.locale
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-1">
                          <ChannelBadge channel={camp.channel} />
                        </td>
                        <td className="py-2 px-1">
                          <TypeBadge type={camp.type} />
                        </td>
                        <td className="py-2 px-1 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                          {camp.sentCount > 0
                            ? formatNumber(camp.sentCount, user.locale)
                            : "—"}
                        </td>
                        <td className="py-2 px-1 text-right tabular-nums whitespace-nowrap">
                          {camp.deliveredCount > 0 ? (
                            <div>
                              <div className="font-semibold text-slate-800">
                                {formatNumber(camp.deliveredCount, user.locale)}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                ({delPct}%)
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 px-1 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                          {formatNumber(camp.clickCount, user.locale)}
                        </td>
                        <td className="py-2 px-1 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                          {formatNumber(camp.leadCount, user.locale)}
                        </td>
                        <td className="py-2 px-1">
                          <StatusBadge status={camp.status} />
                        </td>
                        <td className="relative py-2 pl-1 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title="View campaign details"
                              onClick={() => setDetailCampaign(camp)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="More actions"
                              onClick={() =>
                                setOpenMenuId((cur) =>
                                  cur === camp.id ? null : camp.id
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                          {openMenuId === camp.id && (
                            <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setTelemetryCampaign(camp);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <Activity className="h-3.5 w-3.5" />
                                <span>Record Telemetry</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCampaign(camp.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete Campaign</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cielora AI Assistant Card */}
        <div className="xl:col-span-4 cielora-ai-card flex flex-col justify-between rounded-[22px] border border-violet-100 p-5 shadow-[0_8px_28px_rgba(124,58,237,0.08)]">
          <div className="flex items-center gap-4">
            <BotEmblem size="md" />
            <div>
              <h2 className="text-[15.5px] font-bold text-slate-900">
                Cielora AI{" "}
                <span className="text-[#7C3AED]">Assistant</span>
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Get smart suggestions, optimize campaigns, and grow faster with
                AI.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openAiAssistant()}
            className="cielora-ai-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white transition"
          >
            <span>Ask Cielora AI</span>
            <Sparkles className="h-4 w-4 text-amber-300" />
          </button>
        </div>
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
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mod.iconBg}`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2} />
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
