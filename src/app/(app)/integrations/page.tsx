"use client";

import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, LayoutGrid, ShieldCheck, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/ChannelBadge";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatDate } from "@/lib/format";

interface IntegrationItem {
  provider: string;
  name: string;
  description: string;
  category: string;
  status: string;
  displayName: string;
  configPreview: string | null;
  lastSyncedAt: string | null;
}

export default function IntegrationsPage() {
  const { user } = useWorkspace();
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<IntegrationItem | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.integrations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const openModal = (item: IntegrationItem) => {
    setSelected(item);
    setDisplayName(item.displayName || item.name);
    setApiKey("");
    setAccountId("");
    setWebhookUrl("");
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/integrations/${selected.provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          apiKey,
          accountId: accountId || undefined,
          webhookUrl: webhookUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to save integration.");
        return;
      }
      setSelected(null);
      loadIntegrations();
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
    loadIntegrations();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Integrations</h1>
            <p className="text-xs text-slate-500">
              API credentials are encrypted at rest with AES-256-GCM and isolated strictly to your user account.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>AES-256-GCM Encrypted Vault</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
          Loading integrations...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.provider}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    {item.category}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h2 className="mt-3 text-base font-bold text-slate-900">
                  {item.name}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {item.description}
                </p>
                {item.configPreview && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <KeyRound className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                    <span>Stored key: {item.configPreview}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">
                  {item.lastSyncedAt
                    ? `Updated ${formatDate(item.lastSyncedAt, user.timezone, user.locale)}`
                    : "Not connected"}
                </span>
                <div className="flex items-center gap-2">
                  {item.status === "CONNECTED" && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(item.provider)}
                      title="Disconnect integration"
                      className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openModal(item)}
                    className="cielora-gradient-btn rounded-xl px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    {item.status === "CONNECTED" ? "Rotate Key" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setSelected(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Connect {selected.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Secrets are encrypted before storage and never exposed back in plaintext.
            </p>
            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Connection Label
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  API Token / Secret Key
                </label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter provider API token"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Account / Phone Number ID (optional)
                </label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
              {selected.provider === "WEBHOOK" && (
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Webhook HTTPS URL
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhooks/cielora"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="cielora-gradient-btn rounded-xl px-5 py-2 font-semibold text-white"
                >
                  {saving ? "Encrypting..." : "Save Encrypted"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
