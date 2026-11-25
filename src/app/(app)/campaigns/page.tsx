"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Eye,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  CampaignDetailModal,
  CampaignRecord,
  CreateCampaignModal,
  RecordTelemetryModal,
} from "@/components/CampaignModals";
import { ChannelBadge, StatusBadge, TypeBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES } from "@/lib/validation";

export default function CampaignsPage() {
  const { user } = useWorkspace();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<CampaignRecord | null>(null);
  const [telemetryCampaign, setTelemetryCampaign] = useState<CampaignRecord | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "ALL") qs.set("status", statusFilter);
      if (channelFilter !== "ALL") qs.set("channel", channelFilter);
      if (search.trim()) qs.set("search", search.trim());
      const res = await fetch(`/api/campaigns?${qs.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, search]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadCampaigns();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) loadCampaigns();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Campaigns</h1>
            <p className="text-xs text-slate-500">
              Manage omnichannel campaigns and log real performance telemetry.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="cielora-gradient-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter campaigns by name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-violet-500 focus:bg-white focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="ALL">All Statuses</option>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          aria-label="Filter by channel"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="ALL">All Channels</option>
          {CAMPAIGN_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
        {loading ? (
          <p className="py-10 text-center text-xs text-slate-400">
            Loading campaigns...
          </p>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold text-slate-800">
              No campaigns found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Create your first campaign to start collecting real metrics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 pr-4">Campaign</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Budget</th>
                  <th className="py-3 px-3 text-right">Sent</th>
                  <th className="py-3 px-3 text-right">Clicks</th>
                  <th className="py-3 px-3 text-right">Leads</th>
                  <th className="py-3 px-3 text-right">Revenue</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-900">{camp.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {formatDate(camp.createdAt, user.timezone, user.locale)}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <ChannelBadge channel={camp.channel} />
                    </td>
                    <td className="py-3.5 px-3">
                      <TypeBadge type={camp.type} />
                    </td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-700">
                      {formatCurrency(camp.budgetCents, user.currency, user.locale)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold tabular-nums">
                      {formatNumber(camp.sentCount, user.locale)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold tabular-nums">
                      {formatNumber(camp.clickCount, user.locale)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold tabular-nums">
                      {formatNumber(camp.leadCount, user.locale)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(camp.revenueCents, user.currency, user.locale)}
                    </td>
                    <td className="py-3.5 px-3">
                      <select
                        value={camp.status}
                        onChange={(e) =>
                          handleStatusChange(camp.id, e.target.value)
                        }
                        aria-label={`Change status for ${camp.name}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        {CAMPAIGN_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <span className="sr-only">
                        <StatusBadge status={camp.status} />
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => setDetailCampaign(camp)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Log telemetry"
                          onClick={() => setTelemetryCampaign(camp)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete campaign"
                          onClick={() => handleDelete(camp.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateCampaignModal
        open={createOpen}
        currency={user.currency}
        onClose={() => setCreateOpen(false)}
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
      />
    </div>
  );
}
