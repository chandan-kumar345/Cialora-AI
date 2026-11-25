"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { ChannelBadge, StatusBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatDate, formatNumber } from "@/lib/format";

interface BulkMessageItem {
  id: string;
  title: string;
  channel: string;
  subject: string | null;
  body: string;
  audienceFilter: string;
  recipientCount: number;
  deliveredCount: number;
  status: string;
  createdAt: string;
  campaign: { id: string; name: string } | null;
}

interface CampaignOption {
  id: string;
  name: string;
}

export default function BulkMessagingPage() {
  const { user } = useWorkspace();
  const [messages, setMessages] = useState<BulkMessageItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS" | "EMAIL">("WHATSAPP");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("ALL_LEADS");
  const [customCount, setCustomCount] = useState("0");
  const [sendImmediately, setSendImmediately] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [msgRes, campRes] = await Promise.all([
        fetch("/api/messaging", { cache: "no-store" }),
        fetch("/api/campaigns?limit=50", { cache: "no-store" }),
      ]);
      if (msgRes.ok) {
        const d = await msgRes.json();
        setMessages(d.messages ?? []);
      }
      if (campRes.ok) {
        const d = await campRes.json();
        setCampaigns(d.campaigns ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          channel,
          subject: channel === "EMAIL" ? subject : undefined,
          body,
          campaignId: campaignId || null,
          audienceFilter,
          recipientCount:
            audienceFilter === "CUSTOM_LIST"
              ? Math.max(0, Math.floor(Number(customCount || "0")))
              : 0,
          sendImmediately,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create broadcast.");
        return;
      }
      setTitle("");
      setSubject("");
      setBody("");
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleSendDraft = async (id: string) => {
    await fetch(`/api/messaging/${id}/send`, { method: "POST" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/messaging/${id}`, { method: "DELETE" });
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bulk Messaging</h1>
          <p className="text-xs text-slate-500">
            Broadcast WhatsApp, global E.164 SMS, and Email templates to your CRM segments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-5 space-y-3.5 text-xs h-fit"
        >
          <h2 className="text-sm font-bold text-slate-900">New Broadcast</h2>
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., VIP Customer Renewal Notice"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Channel</label>
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as "WHATSAPP" | "SMS" | "EMAIL")
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Audience</label>
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="ALL_LEADS">All CRM Leads</option>
                <option value="NEW_LEADS">New Leads</option>
                <option value="QUALIFIED_LEADS">Qualified Leads</option>
                <option value="CUSTOM_LIST">Custom Recipient Count</option>
              </select>
            </div>
          </div>

          {audienceFilter === "CUSTOM_LIST" && (
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Recipient Count
              </label>
              <input
                type="number"
                min="1"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Link to Campaign (optional — updates dashboard metrics)
            </label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <option value="">No linked campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {channel === "EMAIL" && (
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Message Body
            </label>
            <textarea
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your personalized message..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={sendImmediately}
              onChange={(e) => setSendImmediately(e.target.checked)}
              className="rounded border-slate-300 text-violet-600"
            />
            <span>Dispatch immediately and record telemetry</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="cielora-gradient-btn flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-white"
          >
            <Send className="h-3.5 w-3.5" />
            <span>
              {saving
                ? "Processing..."
                : sendImmediately
                  ? "Send Broadcast"
                  : "Save Draft"}
            </span>
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
              Loading broadcasts...
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-800">No broadcasts yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Create a WhatsApp, SMS, or Email broadcast to engage your leads.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="rounded-3xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={m.channel} />
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {m.status !== "SENT" && (
                      <button
                        type="button"
                        onClick={() => handleSendDraft(m.id)}
                        className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700 hover:bg-violet-100"
                      >
                        Send Now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-2.5 text-sm font-bold text-slate-900">{m.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{m.body}</p>
                <div className="mt-3 flex flex-wrap justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                  <span>
                    {formatDate(m.createdAt, user.timezone, user.locale)}
                    {m.campaign ? ` · Campaign: ${m.campaign.name}` : ""}
                  </span>
                  <span className="font-semibold text-slate-700">
                    Recipients: {formatNumber(m.recipientCount, user.locale)} ·
                    Delivered: {formatNumber(m.deliveredCount, user.locale)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
