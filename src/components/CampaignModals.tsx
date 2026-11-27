"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Calendar,
  ImagePlus,
  Instagram,
  Layers,
  Mail,
  Megaphone,
  MessageSquare,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  fromMinorUnits,
  getCurrencyMeta,
  toMinorUnits,
} from "@/lib/format";
import {
  CampaignChannelCell,
  CampaignStatusPill,
  TypeBadge,
} from "@/components/ChannelBadge";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from "@/lib/validation";

export interface CampaignRecord {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  type: string;
  status: string;
  mediaType?: string;
  mediaUrl?: string | null;
  footerText?: string | null;
  actionsJson?: string | null;
  budgetCents: number;
  sentCount: number;
  deliveredCount: number;
  clickCount: number;
  leadCount: number;
  revenueCents: number;
  scheduledAt: string | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  createdAt: string;
}

const THUMB_THEMES: Record<string, { bg: string; accent: string; Icon: React.ComponentType<{ className?: string }> }> = {
  WHATSAPP: {
    bg: "from-[#0F3D2E] via-[#15803D] to-[#34D399]",
    accent: "bg-emerald-300/30 text-white",
    Icon: Sparkles,
  },
  EMAIL: {
    bg: "from-[#431407] via-[#9A3412] to-[#F59E0B]",
    accent: "bg-amber-200/30 text-amber-50",
    Icon: Mail,
  },
  SMS: {
    bg: "from-[#0C4A6E] via-[#0284C7] to-[#7DD3FC]",
    accent: "bg-sky-200/30 text-white",
    Icon: MessageSquare,
  },
  META_ADS: {
    bg: "from-[#1E3A8A] via-[#2563EB] to-[#60A5FA]",
    accent: "bg-blue-200/30 text-white",
    Icon: Megaphone,
  },
  GOOGLE_ADS: {
    bg: "from-[#14532D] via-[#16A34A] to-[#86EFAC]",
    accent: "bg-green-200/30 text-white",
    Icon: Megaphone,
  },
  INSTAGRAM: {
    bg: "from-[#701A75] via-[#DB2777] to-[#FB923C]",
    accent: "bg-pink-200/30 text-white",
    Icon: Instagram,
  },
  FACEBOOK: {
    bg: "from-[#172554] via-[#1D4ED8] to-[#93C5FD]",
    accent: "bg-blue-200/30 text-white",
    Icon: Share2,
  },
  LINKEDIN: {
    bg: "from-[#082F49] via-[#0369A1] to-[#38BDF8]",
    accent: "bg-cyan-200/30 text-white",
    Icon: Layers,
  },
};

export function CampaignThumbnail({
  campaign,
  className = "h-11 w-[68px] rounded-xl",
}: {
  campaign: Pick<CampaignRecord, "name" | "channel" | "mediaUrl">;
  className?: string;
}) {
  if (campaign.mediaUrl) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-slate-200/80 bg-slate-100 shadow-xs ${className}`}
      >
        <img
          src={campaign.mediaUrl}
          alt={campaign.name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const theme = THUMB_THEMES[campaign.channel] ?? {
    bg: "from-[#3B0764] via-[#7C3AED] to-[#C084FC]",
    accent: "bg-violet-200/30 text-white",
    Icon: Sparkles,
  };
  const Icon = theme.Icon;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-white/60 bg-gradient-to-br ${theme.bg} shadow-xs ${className}`}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white/18 blur-[1px]" />
      <div className="pointer-events-none absolute -bottom-3 -left-2 h-8 w-8 rounded-full bg-black/15" />
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-xs ${theme.accent}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}

export function CreateCampaignModal({
  open,
  currency,
  initialCampaign = null,
  onClose,
  onCreated,
}: {
  open: boolean;
  currency: string;
  initialCampaign?: CampaignRecord | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const isEditing = Boolean(initialCampaign);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<(typeof CAMPAIGN_CHANNELS)[number]>("WHATSAPP");
  const [type, setType] = useState<(typeof CAMPAIGN_TYPES)[number]>("MARKETING");
  const [status, setStatus] = useState<(typeof CAMPAIGN_STATUSES)[number]>("ACTIVE");
  const [budgetMajor, setBudgetMajor] = useState("0");
  const [scheduledDate, setScheduledDate] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialCampaign) {
      setName(initialCampaign.name);
      setDescription(initialCampaign.description ?? "");
      setChannel(
        CAMPAIGN_CHANNELS.includes(
          initialCampaign.channel as (typeof CAMPAIGN_CHANNELS)[number]
        )
          ? (initialCampaign.channel as (typeof CAMPAIGN_CHANNELS)[number])
          : "WHATSAPP"
      );
      setType(
        CAMPAIGN_TYPES.includes(
          initialCampaign.type as (typeof CAMPAIGN_TYPES)[number]
        )
          ? (initialCampaign.type as (typeof CAMPAIGN_TYPES)[number])
          : "MARKETING"
      );
      setStatus(
        CAMPAIGN_STATUSES.includes(
          initialCampaign.status as (typeof CAMPAIGN_STATUSES)[number]
        )
          ? (initialCampaign.status as (typeof CAMPAIGN_STATUSES)[number])
          : "DRAFT"
      );
      setBudgetMajor(String(fromMinorUnits(initialCampaign.budgetCents, currency)));
      setScheduledDate(
        initialCampaign.scheduledAt ? initialCampaign.scheduledAt.slice(0, 10) : ""
      );
      setMediaUrl(initialCampaign.mediaUrl ?? "");
    } else {
      setName("");
      setDescription("");
      setChannel("WHATSAPP");
      setType("MARKETING");
      setStatus("ACTIVE");
      setBudgetMajor("0");
      setScheduledDate("");
      setMediaUrl("");
    }
  }, [open, initialCampaign, currency]);

  if (!open) return null;

  const currencyMeta = getCurrencyMeta(currency);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("Please select an image smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setError(null);
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const budgetNum = Number(budgetMajor || "0");
      const budgetCents = Number.isFinite(budgetNum) && budgetNum >= 0
        ? toMinorUnits(budgetNum, currency)
        : 0;

      const trimmedMedia = mediaUrl.trim();
      const scheduledIso = scheduledDate
        ? new Date(`${scheduledDate}T09:00:00.000Z`).toISOString()
        : null;

      const endpoint = initialCampaign
        ? `/api/campaigns/${initialCampaign.id}`
        : "/api/campaigns";
      const method = initialCampaign ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          channel,
          type,
          status,
          mediaType: trimmedMedia ? "IMAGE" : "NONE",
          mediaUrl: trimmedMedia || null,
          budgetCents,
          scheduledAt: scheduledIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ??
            (isEditing ? "Failed to update campaign." : "Failed to create campaign.")
        );
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError(
        isEditing
          ? "Network error while updating campaign."
          : "Network error while creating campaign."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? "Edit Campaign" : "Create Campaign"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing
                ? "Update campaign details, creative thumbnail, schedule, or status."
                : "Saved directly to your isolated workspace via API."}
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
              placeholder="e.g., Festive Jewellery Offer"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                Schedule Date (optional)
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Thumbnail Image (optional)
            </label>
            <div className="flex items-center gap-3">
              <CampaignThumbnail
                campaign={{ name: name || "Preview", channel, mediaUrl: mediaUrl || null }}
                className="h-11 w-[68px] rounded-xl"
              />
              <input
                type="text"
                value={mediaUrl.startsWith("data:") ? "" : mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={
                  mediaUrl.startsWith("data:")
                    ? "Uploaded image selected"
                    : "https://... or upload image"
                }
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
              />
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-100">
                <ImagePlus className="h-4 w-4" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={() => setMediaUrl("")}
                  title="Remove thumbnail"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
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
              {saving
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Campaign"}
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
  onEdit,
  onRecordTelemetry,
  onDelete,
}: {
  campaign: CampaignRecord | null;
  currency: string;
  locale: string;
  timezone: string;
  onClose: () => void;
  onEdit?: (campaign: CampaignRecord) => void;
  onRecordTelemetry?: (campaign: CampaignRecord) => void;
  onDelete?: (campaign: CampaignRecord) => void;
}) {
  if (!campaign) return null;
  const deliveryRate =
    campaign.sentCount > 0
      ? Math.round((campaign.deliveredCount / campaign.sentCount) * 1000) / 10
      : 0;
  const scheduleOrSent =
    campaign.status === "SCHEDULED"
      ? campaign.scheduledAt
      : campaign.startedAt ?? campaign.scheduledAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <CampaignThumbnail
              campaign={campaign}
              className="h-12 w-[72px] rounded-2xl"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{campaign.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Created on {formatDate(campaign.createdAt, timezone, locale)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <CampaignChannelCell channel={campaign.channel} />
          <TypeBadge type={campaign.type} />
          <CampaignStatusPill status={campaign.status} />
          {scheduleOrSent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <Calendar className="h-3 w-3" />
              <span>
                {campaign.status === "SCHEDULED" ? "Scheduled" : "Sent"}{" "}
                {formatDate(scheduleOrSent, timezone, locale)}
              </span>
            </span>
          )}
        </div>

        {campaign.description && (
          <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            {campaign.description}
          </p>
        )}

        {campaign.footerText && (
          <p className="mt-2 px-1 text-[11px] italic text-slate-400">
            Footer: {campaign.footerText}
          </p>
        )}

        {(() => {
          if (!campaign.actionsJson) return null;
          try {
            const parsed = JSON.parse(campaign.actionsJson) as Array<{
              type: string;
              label: string;
            }>;
            if (!Array.isArray(parsed) || parsed.length === 0) return null;
            return (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parsed.map((act, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-[#6D28D9]"
                  >
                    {act.label}
                  </span>
                ))}
              </div>
            );
          } catch {
            return null;
          }
        })()}

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

        {(onEdit || onRecordTelemetry || onDelete) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(campaign);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onRecordTelemetry && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRecordTelemetry(campaign);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Log Telemetry</span>
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(campaign);
                  }}
                  className="cielora-gradient-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Campaign</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
