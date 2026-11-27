"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  CampaignDetailModal,
  CampaignRecord,
  CampaignThumbnail,
  CreateCampaignModal,
  RecordTelemetryModal,
} from "@/components/CampaignModals";
import {
  CampaignChannelCell,
  CampaignStatusPill,
} from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatDate, formatNumber } from "@/lib/format";
import { CAMPAIGN_CHANNELS } from "@/lib/validation";

interface OverviewCounts {
  total: number;
  active: number;
  scheduled: number;
  completed: number;
  drafts: number;
  paused: number;
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  EMAIL: "Email",
  SMS: "SMS",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
};

export default function CampaignsPage() {
  const { user } = useWorkspace();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [counts, setCounts] = useState<OverviewCounts>({
    total: 0,
    active: 0,
    scheduled: 0,
    completed: 0,
    drafts: 0,
    paused: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [editCampaign, setEditCampaign] = useState<CampaignRecord | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<CampaignRecord | null>(null);
  const [telemetryCampaign, setTelemetryCampaign] = useState<CampaignRecord | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "ALL") qs.set("status", statusFilter);
      if (channelFilter !== "ALL") qs.set("channel", channelFilter);
      if (search.trim()) qs.set("search", search.trim());

      const [campRes, ovRes] = await Promise.all([
        fetch(`/api/campaigns?${qs.toString()}`, { cache: "no-store" }),
        fetch("/api/analytics/overview", { cache: "no-store" }),
      ]);

      if (campRes.ok) {
        const data = await campRes.json();
        setCampaigns(data.campaigns ?? []);
      }
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setCounts({
          total: ovData.total ?? 0,
          active: ovData.active ?? 0,
          scheduled: ovData.scheduled ?? 0,
          completed: ovData.completed ?? 0,
          drafts: ovData.drafts ?? 0,
          paused: ovData.paused ?? 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, search]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) loadCampaigns();
  };

  const tabs = [
    { key: "ALL", label: "All", count: counts.total },
    { key: "DRAFT", label: "Drafts", count: counts.drafts },
    { key: "SCHEDULED", label: "Scheduled", count: counts.scheduled },
    { key: "ACTIVE", label: "Active", count: counts.active },
    { key: "COMPLETED", label: "Completed", count: counts.completed },
    ...(counts.paused > 0
      ? [{ key: "PAUSED", label: "Paused", count: counts.paused }]
      : []),
  ];

  const getActionConfig = (camp: CampaignRecord) => {
    if (camp.status === "DRAFT") {
      return {
        label: "Continue editing",
        onClick: () => setEditCampaign(camp),
      };
    }
    if (camp.status === "SCHEDULED") {
      return {
        label: "View schedule",
        onClick: () => setDetailCampaign(camp),
      };
    }
    return {
      label: "View results",
      onClick: () => setDetailCampaign(camp),
    };
  };

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E6DCFF] bg-[#F3EEFF] text-[#6D28D9] shadow-2xs">
            <TrendingUp className="h-5 w-5" strokeWidth={2.1} />
          </span>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">
              Campaigns
            </h1>
            <p className="text-[13px] font-medium text-slate-500">
              Manage campaigns across your channels.
            </p>
          </div>
        </div>

        <Link
          href="/campaigns/new"
          className="cielora-gradient-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          <span>Create Campaign</span>
        </Link>
      </div>

      {/* Unified Card Container */}
      <div className="overflow-hidden rounded-[24px] border border-violet-100/90 bg-white shadow-[0_8px_30px_rgba(91,33,182,0.05)]">
        {/* Status Tabs */}
        <div className="no-scrollbar flex items-center gap-7 overflow-x-auto border-b border-slate-100 px-6">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`relative inline-flex shrink-0 items-center gap-2 py-4 text-[13.5px] transition whitespace-nowrap ${
                  isActive
                    ? "font-bold text-[#6D28D9]"
                    : "font-medium text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    isActive
                      ? "bg-[#EDE7FE] text-[#6D28D9]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#7C3AED]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Channel Filter */}
        <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              aria-label="Search campaigns"
              className="h-[42px] w-full rounded-xl border border-slate-200/90 bg-[#FAF9FE] pl-10 pr-4 text-[13px] text-slate-800 placeholder:text-slate-400 transition focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-violet-500/10"
            />
          </div>

          <div className="relative sm:w-44">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              aria-label="Filter by channel"
              className="cielora-select-clean h-[42px] w-full rounded-xl border border-slate-200/90 bg-white pl-3.5 pr-9 text-[13px] font-medium text-slate-700 transition focus:border-violet-400 focus:outline-none focus:ring-3 focus:ring-violet-500/10"
            >
              <option value="ALL">All channels</option>
              {CAMPAIGN_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c] ?? c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="px-6 pb-6">
          {loading ? (
            <p className="py-12 text-center text-xs font-medium text-slate-400">
              Loading campaigns...
            </p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FAF9FE] px-6 py-12 text-center">
              <p className="text-sm font-bold text-slate-800">
                No campaigns found
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {search.trim() || statusFilter !== "ALL" || channelFilter !== "ALL"
                  ? "Try clearing your search or status/channel filters."
                  : "Create your first campaign to start collecting real metrics."}
              </p>
              {statusFilter === "ALL" && channelFilter === "ALL" && !search.trim() && (
                <Link
                  href="/campaigns/new"
                  className="cielora-gradient-btn mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Campaign</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="rounded-l-xl bg-[#F3EEFF] py-3.5 pl-4 pr-3 text-[12.5px] font-bold text-slate-800">
                      Campaign name
                    </th>
                    <th className="bg-[#F3EEFF] px-3 py-3.5 text-[12.5px] font-bold text-slate-800">
                      Channel
                    </th>
                    <th className="bg-[#F3EEFF] px-3 py-3.5 text-[12.5px] font-bold text-slate-800">
                      Status
                    </th>
                    <th className="bg-[#F3EEFF] px-3 py-3.5 text-[12.5px] font-bold text-slate-800">
                      Scheduled / sent
                    </th>
                    <th className="bg-[#F3EEFF] px-3 py-3.5 text-[12.5px] font-bold text-slate-800">
                      Delivered
                    </th>
                    <th className="bg-[#F3EEFF] px-3 py-3.5 text-[12.5px] font-bold text-slate-800">
                      Clicks
                    </th>
                    <th className="rounded-r-xl bg-[#F3EEFF] py-3.5 pl-3 pr-4 text-[12.5px] font-bold text-slate-800">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((camp, index) => {
                    const isLast = index === campaigns.length - 1;
                    const rowBorder = isLast ? "" : "border-b border-slate-100";
                    const dateToShow =
                      camp.status === "DRAFT"
                        ? null
                        : camp.status === "SCHEDULED"
                          ? camp.scheduledAt ?? camp.createdAt
                          : camp.startedAt ?? camp.scheduledAt ?? camp.createdAt;
                    const actionCfg = getActionConfig(camp);

                    return (
                      <tr
                        key={camp.id}
                        className="transition-colors hover:bg-[#FAF8FF]/80"
                      >
                        <td className={`${rowBorder} py-3.5 pl-4 pr-3`}>
                          <div className="flex items-center gap-3.5">
                            <CampaignThumbnail
                              campaign={camp}
                              className="h-11 w-[68px] rounded-xl"
                            />
                            <span className="text-[13.5px] font-bold text-slate-900">
                              {camp.name}
                            </span>
                          </div>
                        </td>
                        <td className={`${rowBorder} px-3 py-3.5`}>
                          <CampaignChannelCell channel={camp.channel} />
                        </td>
                        <td className={`${rowBorder} px-3 py-3.5`}>
                          <CampaignStatusPill status={camp.status} />
                        </td>
                        <td
                          className={`${rowBorder} px-3 py-3.5 text-[13px] font-medium text-slate-700 tabular-nums whitespace-nowrap`}
                        >
                          {dateToShow
                            ? formatDate(dateToShow, user.timezone, user.locale)
                            : "—"}
                        </td>
                        <td
                          className={`${rowBorder} px-3 py-3.5 text-[13px] font-semibold text-slate-800 tabular-nums whitespace-nowrap`}
                        >
                          {camp.status === "DRAFT" || camp.deliveredCount === 0
                            ? "—"
                            : formatNumber(camp.deliveredCount, user.locale)}
                        </td>
                        <td
                          className={`${rowBorder} px-3 py-3.5 text-[13px] font-semibold text-slate-800 tabular-nums whitespace-nowrap`}
                        >
                          {camp.status === "DRAFT" || camp.clickCount === 0
                            ? "—"
                            : formatNumber(camp.clickCount, user.locale)}
                        </td>
                        <td className={`${rowBorder} py-3.5 pl-3 pr-4`}>
                          <button
                            type="button"
                            onClick={actionCfg.onClick}
                            className="inline-flex min-w-[144px] items-center justify-center gap-1.5 rounded-full border border-[#E5DBFF] bg-[#F4F0FF] px-4 py-2 text-xs font-semibold text-[#6D28D9] transition hover:border-[#D4C2FF] hover:bg-[#EAE1FF] whitespace-nowrap"
                          >
                            <span>{actionCfg.label}</span>
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreateCampaignModal
        open={Boolean(editCampaign)}
        currency={user.currency}
        initialCampaign={editCampaign}
        onClose={() => setEditCampaign(null)}
        onCreated={loadCampaigns}
      />
      <RecordTelemetryModal
        campaign={telemetryCampaign}
        currency={user.currency}
        onClose={() => setTelemetryCampaign(null)}
        onRecorded={loadCampaigns}
      />
      <CampaignDetailModal
        campaign={detailCampaign}
        currency={user.currency}
        locale={user.locale}
        timezone={user.timezone}
        onClose={() => setDetailCampaign(null)}
        onEdit={(camp) => setEditCampaign(camp)}
        onRecordTelemetry={(camp) => setTelemetryCampaign(camp)}
        onDelete={(camp) => handleDelete(camp.id)}
      />
    </div>
  );
}
