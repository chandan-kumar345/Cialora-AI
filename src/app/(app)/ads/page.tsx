"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { ChannelBadge, StatusBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import {
  formatCurrency,
  formatNumber,
  getCurrencyMeta,
  toMinorUnits,
} from "@/lib/format";

interface AdCampaignItem {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  dailyBudgetCents: number;
  spendCents: number;
  impressionsCount: number;
  clicksCount: number;
  conversionsCount: number;
  revenueCents: number;
  createdAt: string;
}

export default function AdsManagerPage() {
  const { user } = useWorkspace();
  const [ads, setAds] = useState<AdCampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("META_ADS");
  const [objective, setObjective] = useState("CONVERSIONS");
  const [budgetMajor, setBudgetMajor] = useState("50");
  const [saving, setSaving] = useState(false);

  const currencyMeta = getCurrencyMeta(user.currency);

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ads", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dailyBudgetCents = toMinorUnits(Number(budgetMajor || "0"), user.currency);
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          platform,
          objective,
          status: "ACTIVE",
          dailyBudgetCents,
        }),
      });
      if (res.ok) {
        setName("");
        loadAds();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (ad: AdCampaignItem) => {
    const nextStatus = ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await fetch(`/api/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    loadAds();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    loadAds();
  };

  const totalSpend = ads.reduce((s, a) => s + a.spendCents, 0);
  const totalRevenue = ads.reduce((s, a) => s + a.revenueCents, 0);
  const totalImpressions = ads.reduce((s, a) => s + a.impressionsCount, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicksCount, 0);
  const overallRoas =
    totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <BarChart2 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ads Manager</h1>
          <p className="text-xs text-slate-500">
            Track Meta, Google, LinkedIn, and TikTok paid ad spend &amp; ROAS in{" "}
            {user.currency}.
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Total Spend</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900">
            {formatCurrency(totalSpend, user.currency, user.locale)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Impressions</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900">
            {formatNumber(totalImpressions, user.locale)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Ad Clicks</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900">
            {formatNumber(totalClicks, user.locale)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Blended ROAS</div>
          <div className="mt-1 text-lg font-extrabold text-emerald-600">
            {overallRoas}x
          </div>
        </div>
      </div>

      {/* Create Paid Ad Form */}
      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-xs sm:grid-cols-5 sm:items-end"
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block font-semibold text-slate-700">
            Ad Campaign Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Global SaaS Retargeting Q4"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block font-semibold text-slate-700">
            Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <option value="META_ADS">Meta Ads</option>
            <option value="GOOGLE_ADS">Google Ads</option>
            <option value="LINKEDIN_ADS">LinkedIn Ads</option>
            <option value="TIKTOK_ADS">TikTok Ads</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-semibold text-slate-700">
            Daily Budget ({currencyMeta.symbol})
          </label>
          <input
            type="number"
            min="0"
            step={currencyMeta.decimals === 0 ? "1" : "0.01"}
            value={budgetMajor}
            onChange={(e) => setBudgetMajor(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={saving}
            className="cielora-gradient-btn flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Launch Ad"}</span>
          </button>
        </div>
      </form>

      {/* Ads Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading ads...</p>
        ) : ads.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No paid ad campaigns created yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <th className="py-3">Campaign</th>
                  <th className="py-3">Platform</th>
                  <th className="py-3">Objective</th>
                  <th className="py-3 text-right">Daily Budget</th>
                  <th className="py-3 text-right">Spend</th>
                  <th className="py-3 text-right">Clicks</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td className="py-3 font-bold text-slate-900">{ad.name}</td>
                    <td className="py-3">
                      <ChannelBadge channel={ad.platform} />
                    </td>
                    <td className="py-3 text-slate-600">
                      {ad.objective.replaceAll("_", " ")}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatCurrency(ad.dailyBudgetCents, user.currency, user.locale)}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatCurrency(ad.spendCents, user.currency, user.locale)}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatNumber(ad.clicksCount, user.locale)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={ad.status} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleStatus(ad)}
                          title={ad.status === "ACTIVE" ? "Pause ad" : "Resume ad"}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          {ad.status === "ACTIVE" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ad.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
