"use client";

import React, { useState } from "react";
import { Activity, X } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  fromMinorUnits,
  getCurrencyMeta,
  toMinorUnits,
} from "@/lib/format";
import { ChannelBadge, StatusBadge, TypeBadge } from "@/components/ChannelBadge";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from "@/lib/validation";

export interface CampaignRecord {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  type: string;
  status: string;
  budgetCents: number;
  sentCount: number;
  deliveredCount: number;
  clickCount: number;
  leadCount: number;
  revenueCents: number;
  scheduledAt: string | null;
  createdAt: string;
}

export function CreateCampaignModal({
  open,
  currency,
  onClose,
  onCreated,
}: {
  open: boolean;
  currency: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<(typeof CAMPAIGN_CHANNELS)[number]>("WHATSAPP");
  const [type, setType] = useState<(typeof CAMPAIGN_TYPES)[number]>("MARKETING");
  const [status, setStatus] = useState<(typeof CAMPAIGN_STATUSES)[number]>("ACTIVE");
  const [budgetMajor, setBudgetMajor] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const currencyMeta = getCurrencyMeta(currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const budgetNum = Number(budgetMajor || "0");
      const budgetCents = Number.isFinite(budgetNum) && budgetNum >= 0
        ? toMinorUnits(budgetNum, currency)
        : 0;

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          channel,
          type,
          status,
          budgetCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create campaign.");
        return;
      }
      setName("");
      setDescription("");
      setBudgetMajor("0");
      onCreated();
      onClose();
    } catch {
      setError("Network error while creating campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Campaign</h2>
            <p className="text-xs text-slate-500">
              Saved directly to your isolated workspace via API.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Campaign Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Global Holiday Product Launch"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as (typeof CAMPAIGN_CHANNELS)[number])
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
              >
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Type
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as (typeof CAMPAIGN_TYPES)[number])
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as (typeof CAMPAIGN_STATUSES)[number])
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
              >
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Budget ({currencyMeta.code} {currencyMeta.symbol})
            </label>
            <input
              type="number"
              min="0"
              step={currencyMeta.decimals === 0 ? "1" : "0.01"}
              value={budgetMajor}
              onChange={(e) => setBudgetMajor(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Target audience, offer details, or CTA notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cielora-gradient-btn rounded-xl px-5 py-2 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RecordTelemetryModal({
  campaign,
  currency,
  onClose,
  onRecorded,
}: {
  campaign: CampaignRecord | null;
  currency: string;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sentCount, setSentCount] = useState("0");
  const [deliveredCount, setDeliveredCount] = useState("0");
  const [clickCount, setClickCount] = useState("0");
  const [leadCount, setLeadCount] = useState("0");
  const [revenueMajor, setRevenueMajor] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!campaign) return null;
  const currencyMeta = getCurrencyMeta(currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const revNum = Number(revenueMajor || "0");
      const res = await fetch(`/api/campaigns/${campaign.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sentCount: Math.max(0, Math.floor(Number(sentCount || 0))),
          deliveredCount: Math.max(0, Math.floor(Number(deliveredCount || 0))),
          clickCount: Math.max(0, Math.floor(Number(clickCount || 0))),
          leadCount: Math.max(0, Math.floor(Number(leadCount || 0))),
          revenueCents:
            Number.isFinite(revNum) && revNum >= 0
              ? toMinorUnits(revNum, currency)
              : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to record telemetry event.");
        return;
      }
      onRecorded();
      onClose();
    } catch {
      setError("Network error recording event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-600" />
            <h2 className="text-base font-bold text-slate-900">
              Record Campaign Telemetry
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Log real performance events for <span className="font-semibold text-slate-700">{campaign.name}</span>.
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Event Date (UTC)
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Messages Sent
              </label>
              <input
                type="number"
                min="0"
                value={sentCount}
                onChange={(e) => setSentCount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Delivered
              </label>
              <input
                type="number"
                min="0"
                value={deliveredCount}
                onChange={(e) => setDeliveredCount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Clicks
              </label>
              <input
                type="number"
                min="0"
                value={clickCount}
                onChange={(e) => setClickCount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Leads Captured
              </label>
              <input
                type="number"
                min="0"
                value={leadCount}
                onChange={(e) => setLeadCount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Attributed Revenue ({currencyMeta.code} {currencyMeta.symbol})
            </label>
            <input
              type="number"
              min="0"
              step={currencyMeta.decimals === 0 ? "1" : "0.01"}
              value={revenueMajor}
              onChange={(e) => setRevenueMajor(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cielora-gradient-btn rounded-xl px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Record Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CampaignDetailModal({
  campaign,
  currency,
  locale,
  timezone,
  onClose,
}: {
  campaign: CampaignRecord | null;
  currency: string;
  locale: string;
  timezone: string;
  onClose: () => void;
}) {
  if (!campaign) return null;
  const deliveryRate =
    campaign.sentCount > 0
      ? Math.round((campaign.deliveredCount / campaign.sentCount) * 1000) / 10
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{campaign.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Created on {formatDate(campaign.createdAt, timezone, locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ChannelBadge channel={campaign.channel} />
          <TypeBadge type={campaign.type} />
          <StatusBadge status={campaign.status} />
        </div>

        {campaign.description && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            {campaign.description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-slate-500">Budget</div>
            <div className="mt-0.5 font-bold text-slate-900">
              {formatCurrency(campaign.budgetCents, currency, locale)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-slate-500">Sent</div>
            <div className="mt-0.5 font-bold text-slate-900">
              {formatNumber(campaign.sentCount, locale)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-slate-500">Delivered</div>
            <div className="mt-0.5 font-bold text-slate-900">
              {formatNumber(campaign.deliveredCount, locale)} ({deliveryRate}%)
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-slate-500">Clicks</div>
            <div className="mt-0.5 font-bold text-slate-900">
              {formatNumber(campaign.clickCount, locale)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-slate-500">Leads</div>
            <div className="mt-0.5 font-bold text-slate-900">
              {formatNumber(campaign.leadCount, locale)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-slate-500">Revenue</div>
            <div className="mt-0.5 font-bold text-emerald-700">
              {formatCurrency(campaign.revenueCents, currency, locale)}
            </div>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-slate-400">
          Budget unit value: {fromMinorUnits(campaign.budgetCents, currency)} {currency}
        </div>
      </div>
    </div>
  );
}
