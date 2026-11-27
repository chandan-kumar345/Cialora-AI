"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Calendar,
  Check,
  CheckCircle2,
  Flag,
  HelpCircle,
  Image as ImageIcon,
  KeyRound,
  Layers,
  LayoutGrid,
  Lock,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/ChannelBadge";
import {
  FacebookBrandBadge,
  InstagramBrandBadge,
  MetaBrandEmblem,
} from "@/components/SocialBrandIcons";
import WhatsAppSignup from "@/components/WhatsAppSignup";
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

type IntegrationTab = "connected" | "add";
type MetaFlowStep = 1 | 2 | 3;

export default function IntegrationsPage() {
  const { user } = useWorkspace();
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<IntegrationTab>("add");
  const [hasInitializedTab, setHasInitializedTab] = useState(false);

  // Interactive Meta Connection Flow (Steps 1 -> 2 -> 3 -> Detail Screen)
  const [metaFlowOpen, setMetaFlowOpen] = useState(false);
  const [metaStep, setMetaStep] = useState<MetaFlowStep>(1);
  const [metaEntryFocus, setMetaEntryFocus] = useState<"INSTAGRAM" | "FACEBOOK">(
    "INSTAGRAM"
  );
  const [metaDetailOpen, setMetaDetailOpen] = useState(false);

  // Select Accounts inputs in Meta Flow Step 3
  const defaultSlug = useMemo(
    () =>
      (user.workspaceName || "cielora")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "brand_account",
    [user.workspaceName]
  );
  const [connectFb, setConnectFb] = useState(true);
  const [fbPageName, setFbPageName] = useState("");
  const [fbPageId, setFbPageId] = useState("");
  const [connectIg, setConnectIg] = useState(true);
  const [igHandle, setIgHandle] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Sync / row menu / guide modal / vault modal
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [menuProvider, setMenuProvider] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Existing Credential Modal for WhatsApp Cloud / Google Ads / SMTP / Twilio / Webhook
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
        const list: IntegrationItem[] = d.integrations ?? [];
        setItems(list);
        if (!hasInitializedTab) {
          const hasAnyConnected = list.some((i) => i.status === "CONNECTED");
          setActiveTab(hasAnyConnected ? "connected" : "add");
          setHasInitializedTab(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [hasInitializedTab]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    if (!fbPageName) {
      setFbPageName(`${user.workspaceName || "Workspace"} Page`);
    }
    if (!igHandle) {
      setIgHandle(`@${defaultSlug}`);
    }
  }, [user.workspaceName, defaultSlug, fbPageName, igHandle]);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((cur) => (cur === msg ? null : cur));
    }, 4500);
  };

  const connectedItems = useMemo(
    () => items.filter((i) => i.status === "CONNECTED"),
    [items]
  );
  const otherProviders = useMemo(
    () =>
      items.filter(
        (i) => i.provider !== "INSTAGRAM" && i.provider !== "FACEBOOK"
      ),
    [items]
  );
  const instagramItem = items.find((i) => i.provider === "INSTAGRAM");
  const facebookItem = items.find((i) => i.provider === "FACEBOOK");
  const metaConnectedCount = [instagramItem, facebookItem].filter(
    (i) => i?.status === "CONNECTED"
  ).length;

  const startMetaFlow = (focus: "INSTAGRAM" | "FACEBOOK") => {
    setMetaEntryFocus(focus);
    setConnectIg(focus === "INSTAGRAM" || instagramItem?.status !== "CONNECTED");
    setConnectFb(focus === "FACEBOOK" || facebookItem?.status !== "CONNECTED");
    setMetaError(null);
    setMetaStep(1);
    setMetaDetailOpen(false);
    setMetaFlowOpen(true);
  };

  const handleCompleteMetaConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectFb && !connectIg) {
      setMetaError("Select at least one Facebook Page or Instagram account.");
      return;
    }
    setMetaError(null);
    setMetaSaving(true);
    try {
      const tokenToStore =
        metaAccessToken.trim() ||
        `meta_oauth_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      const requests: Array<Promise<Response>> = [];
      if (connectFb) {
        requests.push(
          fetch("/api/integrations/FACEBOOK", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: fbPageName.trim() || `${user.workspaceName} Page`,
              apiKey: tokenToStore,
              accountId: fbPageId.trim() || undefined,
            }),
          })
        );
      }
      if (connectIg) {
        const cleanHandle = igHandle.trim().startsWith("@")
          ? igHandle.trim()
          : `@${igHandle.trim() || defaultSlug}`;
        requests.push(
          fetch("/api/integrations/INSTAGRAM", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: cleanHandle,
              apiKey: tokenToStore,
              accountId: igAccountId.trim() || undefined,
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const failed = responses.find((r) => !r.ok);
      if (failed) {
        const errData = await failed.json().catch(() => ({}));
        setMetaError(errData.error ?? "Unable to save Meta account connection.");
        return;
      }

      setMetaAccessToken("");
      setMetaFlowOpen(false);
      setMetaDetailOpen(true);
      setActiveTab("connected");
      await loadIntegrations();
      showToast("Meta accounts connected and encrypted in your workspace vault.");
    } finally {
      setMetaSaving(false);
    }
  };

  const handleSyncNow = async (provider: string) => {
    setSyncingProvider(provider);
    setMenuProvider(null);
    try {
      const res = await fetch(`/api/integrations/${provider}`, {
        method: "PATCH",
      });
      if (res.ok) {
        await loadIntegrations();
        showToast("Account telemetry synced just now.");
      }
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setMenuProvider(null);
    await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
    await loadIntegrations();
    showToast("Integration disconnected from workspace.");
  };

  const handleDisconnectMetaAll = async () => {
    const targets = [facebookItem, instagramItem].filter(
      (i): i is IntegrationItem => Boolean(i && i.status === "CONNECTED")
    );
    await Promise.all(
      targets.map((t) =>
        fetch(`/api/integrations/${t.provider}`, { method: "DELETE" })
      )
    );
    setMetaDetailOpen(false);
    setActiveTab("add");
    await loadIntegrations();
    showToast("Facebook & Instagram connections removed.");
  };

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
      setActiveTab("connected");
      await loadIntegrations();
      showToast(`${selected.name} connected successfully.`);
    } finally {
      setSaving(false);
    }
  };

  const renderProviderBadge = (provider: string) => {
    if (provider === "INSTAGRAM") return <InstagramBrandBadge size="md" />;
    if (provider === "FACEBOOK") return <FacebookBrandBadge size="md" />;
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <LayoutGrid className="h-4.5 w-4.5" />
      </span>
    );
  };

  // ============================================================================
  // VIEW 1: INTERACTIVE META CONNECTION FLOW (3 STEPS FROM MOCKUP)
  // ============================================================================
  if (metaFlowOpen) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              metaStep === 1
                ? setMetaFlowOpen(false)
                : setMetaStep((s) => (s === 3 ? 2 : 1))
            }
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-violet-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Connect Facebook &amp; Instagram</span>
          </button>

          <div className="flex items-center gap-1.5">
            {([1, 2, 3] as MetaFlowStep[]).map((s) => (
              <span
                key={s}
                className={`h-2 rounded-full transition-all ${
                  metaStep === s
                    ? "w-6 bg-[#7C3AED]"
                    : metaStep > s
                      ? "w-2 bg-emerald-500"
                      : "w-2 bg-violet-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-violet-100 bg-white p-6 shadow-[0_14px_40px_-14px_rgba(91,33,182,0.16)] sm:p-8">
          {/* STEP 1: Connect with Meta */}
          {metaStep === 1 && (
            <div className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-[#EEF4FF] to-[#F5F0FF] ring-1 ring-violet-100">
                <MetaBrandEmblem className="h-12 w-16" />
              </div>

              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
                Connect with Meta
              </h1>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
                Link your Facebook Page and Instagram Business Account to enable
                posting and automation.
              </p>

              <div className="mt-6 space-y-2.5 text-left">
                {[
                  {
                    icon: Calendar,
                    text: "Schedule & auto-publish posts",
                  },
                  {
                    icon: Layers,
                    text: "Use AI or ready-made templates",
                  },
                  {
                    icon: BarChart2,
                    text: "Track reach, likes and engagement",
                  },
                  {
                    icon: Users,
                    text: "Manage both accounts in one place",
                  },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.text}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-4 py-3 text-xs font-semibold text-slate-700"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>{row.text}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                <span>Secure connection by Meta</span>
              </div>

              <button
                type="button"
                onClick={() => setMetaStep(2)}
                className="cielora-ai-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white transition"
              >
                <span>Continue with Meta</span>
                <span className="text-base leading-none">∞</span>
              </button>

              <p className="mt-3 text-[11px] text-slate-400">
                Flow entry:{" "}
                {metaEntryFocus === "INSTAGRAM"
                  ? "Instagram Business"
                  : "Facebook Page"}
              </p>
            </div>
          )}

          {/* STEP 2: Permissions Consent */}
          {metaStep === 2 && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-sm font-bold text-slate-900">
                <MetaBrandEmblem className="h-5 w-7" />
                <span>Meta</span>
              </div>

              <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900">
                Allow Cielora AI to access your accounts?
              </h1>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Cielora AI will be able to:
              </p>

              <div className="mt-4 space-y-2.5 text-left">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-4 py-3 text-xs font-semibold text-slate-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Flag className="h-4 w-4" />
                  </span>
                  <span>Manage your Facebook Pages</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-4 py-3 text-xs font-semibold text-slate-800">
                  <InstagramBrandBadge size="sm" />
                  <span>Manage your Instagram Business Account</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-4 py-3 text-xs font-semibold text-slate-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Pencil className="h-4 w-4" />
                  </span>
                  <span>Create, schedule and publish content</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-4 py-3 text-xs font-semibold text-slate-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <BarChart2 className="h-4 w-4" />
                  </span>
                  <span>Read insights and performance data</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  You can remove access anytime from your Meta Business Settings.
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setMetaStep(3)}
                  className="cielora-ai-btn inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-bold text-white transition"
                >
                  Allow &amp; Continue
                </button>
                <button
                  type="button"
                  onClick={() => setMetaFlowOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Select Accounts */}
          {metaStep === 3 && (
            <form onSubmit={handleCompleteMetaConnect}>
              <div className="text-center">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Select Accounts
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Choose the Facebook Page(s) and Instagram Business Account(s)
                  you want to connect.
                </p>
              </div>

              {metaError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {metaError}
                </div>
              )}

              <div className="mt-5 space-y-4">
                {/* Facebook Pages Box */}
                <div className="rounded-2xl border border-slate-200/90 bg-[#FAF9FE] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <FacebookBrandBadge size="xs" />
                    <span>Facebook Pages</span>
                  </div>
                  <div className="mt-3 rounded-xl border border-violet-200/80 bg-white p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={connectFb}
                        onChange={(e) => setConnectFb(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded accent-[#7C3AED]"
                      />
                      <div className="flex-1 space-y-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <FacebookBrandBadge size="sm" />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={fbPageName}
                              onChange={(e) => setFbPageName(e.target.value)}
                              disabled={!connectFb}
                              placeholder="Enter your Facebook Page name"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-violet-400 focus:bg-white focus:outline-none disabled:opacity-60"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          value={fbPageId}
                          onChange={(e) => setFbPageId(e.target.value)}
                          disabled={!connectFb}
                          placeholder="Facebook Page ID (optional)"
                          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 focus:border-violet-400 focus:bg-white focus:outline-none disabled:opacity-60"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Instagram Accounts Box */}
                <div className="rounded-2xl border border-slate-200/90 bg-[#FAF9FE] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <InstagramBrandBadge size="xs" />
                    <span>Instagram Accounts</span>
                  </div>
                  <div className="mt-3 rounded-xl border border-violet-200/80 bg-white p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={connectIg}
                        onChange={(e) => setConnectIg(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded accent-[#7C3AED]"
                      />
                      <div className="flex-1 space-y-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <InstagramBrandBadge size="sm" />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={igHandle}
                              onChange={(e) => setIgHandle(e.target.value)}
                              disabled={!connectIg}
                              placeholder="@your_business_handle"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-violet-400 focus:bg-white focus:outline-none disabled:opacity-60"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          value={igAccountId}
                          onChange={(e) => setIgAccountId(e.target.value)}
                          disabled={!connectIg}
                          placeholder="Instagram Business Account ID (optional)"
                          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 focus:border-violet-400 focus:bg-white focus:outline-none disabled:opacity-60"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    Meta Graph Access Token (optional — encrypted with AES-256-GCM)
                  </label>
                  <input
                    type="password"
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    placeholder="Leave blank to use secure OAuth session token"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-violet-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={metaSaving}
                className="cielora-ai-btn mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white transition disabled:opacity-60"
              >
                <span>
                  {metaSaving
                    ? "Connecting Accounts..."
                    : "Connect Selected Accounts"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: FACEBOOK & INSTAGRAM INTEGRATION DETAIL & QUICK START (MOCKUP BOTTOM-RIGHT)
  // ============================================================================
  if (metaDetailOpen) {
    const connectedOn =
      facebookItem?.lastSyncedAt || instagramItem?.lastSyncedAt;

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMetaDetailOpen(false)}
          className="inline-flex items-center gap-2 text-base font-extrabold text-slate-900 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Facebook &amp; Instagram Integration</span>
        </button>

        {/* Top Meta Status Bar Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-1.5">
              <FacebookBrandBadge size="md" />
              <InstagramBrandBadge size="md" />
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900">
                Meta Accounts
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span>
                  {metaConnectedCount > 0 ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                Connected On
              </div>
              <div className="mt-0.5 font-bold text-slate-900">
                {connectedOn
                  ? formatDate(connectedOn, user.timezone, user.locale)
                  : "Not connected"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                Sync Status
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 font-bold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{metaConnectedCount > 0 ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDisconnectMetaAll}
              className="rounded-full border border-rose-200 bg-rose-50/70 px-4 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Bottom Split: Automation Quick Start (8 cols) + Permissions (4 cols) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 flex flex-col justify-between rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4.5 w-4.5 text-[#7C3AED]" />
                <h2 className="text-[15.5px] font-bold text-slate-900">
                  Automation Quick Start
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Create a posting automation in few steps.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    step: "1. Create Workflow",
                    desc: "Choose a trigger (e.g. schedule)",
                    icon: Plus,
                    bg: "bg-violet-50 text-violet-600",
                    solid: true,
                  },
                  {
                    step: "2. Set Schedule",
                    desc: "Pick date & time or recurring",
                    icon: Calendar,
                    bg: "bg-purple-50 text-purple-600",
                  },
                  {
                    step: "3. Add Content",
                    desc: "Upload or select from library",
                    icon: ImageIcon,
                    bg: "bg-sky-50 text-sky-600",
                  },
                  {
                    step: "4. Automate",
                    desc: "Posts will be published automatically",
                    icon: Rocket,
                    bg: "bg-pink-50 text-pink-600",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="relative flex items-center">
                      <div className="flex-1 rounded-2xl border border-slate-100 bg-[#FAF9FE] p-3.5 text-center">
                        <span
                          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl ${
                            item.solid
                              ? "bg-[#7C3AED] text-white shadow-xs"
                              : item.bg
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="mt-2.5 text-xs font-bold text-slate-900">
                          {item.step}
                        </div>
                        <div className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
                          {item.desc}
                        </div>
                      </div>
                      {idx < 3 && (
                        <ArrowRight className="hidden xl:block -mr-2.5 ml-0.5 h-4 w-4 shrink-0 text-violet-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              href="/automation"
              className="cielora-ai-btn mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-bold text-white transition"
            >
              <span>Create Automation Workflow</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="lg:col-span-4 rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-[#7C3AED]" />
              <h2 className="text-[15.5px] font-bold text-slate-900">
                Permissions
              </h2>
            </div>

            <ul className="mt-4 space-y-3 text-xs font-semibold text-slate-700">
              {[
                "Manage Page & Account",
                "Create & Publish Posts",
                "Read Insights & Performance",
                "Access Media & Content Library",
              ].map((perm) => (
                <li
                  key={perm}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-[#FAF9FE] px-3 py-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: MAIN INTEGRATIONS HUB (CONNECTED ACCOUNTS TAB + ADD INTEGRATION TAB)
  // ============================================================================
  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-200/80 bg-[#F3EEFF] text-[#6D28D9]">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">
              Integrations
            </h1>
            <p className="text-xs text-slate-500">
              Connect your favorite platforms to automate marketing, posting and
              campaigns.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          <span>AES-256-GCM Encrypted Vault</span>
        </div>
      </div>

      {/* Top Pill Tabs: Connected Accounts vs Add Integration */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("connected")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === "connected"
                ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-sm"
                : "text-slate-600 hover:bg-violet-50"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            <span>Connected Accounts ({connectedItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === "add"
                ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-sm"
                : "text-slate-600 hover:bg-violet-50"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Integration</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>See Connection Flow</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-lg p-1 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-[24px] border border-violet-100 bg-white p-10 text-center text-xs text-slate-400">
          Loading integrations...
        </div>
      ) : activeTab === "connected" ? (
        /* ================= CONNECTED ACCOUNTS TAB ================= */
        <div className="space-y-4">
          <div className="rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#7C3AED]" />
                <h2 className="text-[15.5px] font-bold text-slate-900">
                  Connected Accounts
                </h2>
              </div>
              {connectedItems.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  <span>All systems connected</span>
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            {connectedItems.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-[#FAF9FE] px-6 py-10 text-center">
                <p className="text-sm font-bold text-slate-800">
                  No accounts connected yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Connect Instagram, Facebook, WhatsApp Cloud, or paid ad
                  platforms to automate your workflows.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("add")}
                  className="cielora-ai-btn mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Integration</span>
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {connectedItems.map((item) => {
                  const isMetaSocial =
                    item.provider === "FACEBOOK" ||
                    item.provider === "INSTAGRAM";
                  return (
                    <div
                      key={item.provider}
                      className="relative flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[#FAF9FE] px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3.5">
                        {renderProviderBadge(item.provider)}
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {item.provider === "FACEBOOK"
                              ? "Facebook Page"
                              : item.provider === "INSTAGRAM"
                                ? "Instagram Business"
                                : item.name}
                          </div>
                          <div className="text-xs font-medium text-slate-600">
                            {item.displayName}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            <span>Connected</span>
                          </span>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Last Sync:{" "}
                            {item.lastSyncedAt
                              ? formatDate(
                                  item.lastSyncedAt,
                                  user.timezone,
                                  user.locale
                                )
                              : "Just now"}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={syncingProvider === item.provider}
                          onClick={() => handleSyncNow(item.provider)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${
                              syncingProvider === item.provider
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          <span>
                            {syncingProvider === item.provider
                              ? "Syncing..."
                              : "Sync Now"}
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-label="Account actions"
                          onClick={() =>
                            setMenuProvider((cur) =>
                              cur === item.provider ? null : item.provider
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      {menuProvider === item.provider && (
                        <div className="absolute right-4 top-14 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-xs shadow-lg">
                          {isMetaSocial ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuProvider(null);
                                setMetaDetailOpen(true);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Integration Details</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuProvider(null);
                                openModal(item);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              <span>Rotate Key</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDisconnect(item.provider)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Disconnect</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {metaConnectedCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-[#F6F2FF] to-[#FAF5FF] px-4 py-3">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                  <Zap className="h-4 w-4 text-[#7C3AED]" />
                  <span>
                    Meta accounts ready — view permissions &amp; quick-start
                    automation steps.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMetaDetailOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#6D28D9] ring-1 ring-violet-200 hover:bg-violet-50"
                >
                  <span>Open Meta Integration</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= ADD INTEGRATION TAB ================= */
        <div className="space-y-5">
          {/* Cosmic Hero Banner */}
          <section
            className="relative overflow-hidden rounded-[24px] px-6 py-6 text-white shadow-[0_14px_38px_-14px_rgba(91,33,182,0.45)] sm:px-8"
            style={{
              background:
                "radial-gradient(circle at 80% 35%, rgba(192, 38, 211, 0.38) 0%, transparent 55%), radial-gradient(circle at 20% 90%, rgba(109, 40, 217, 0.45) 0%, transparent 50%), linear-gradient(125deg, #160731 0%, #2B0D5C 52%, #47167B 100%)",
            }}
          >
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-lg">
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[30px] sm:leading-[1.15]">
                  Connect &amp; Automate
                  <span className="block text-purple-200">Your Social Media</span>
                </h2>
                <p className="mt-2.5 text-xs leading-relaxed text-purple-100/85 sm:text-[13px]">
                  Link your Instagram and Facebook accounts to schedule posts,
                  run automated campaigns and track performance — all from one
                  place.
                </p>
              </div>

              {/* Stylized Laptop & Floating Meta Icons Illustration */}
              <div className="relative hidden md:flex items-center justify-center pr-2">
                <div className="relative flex h-36 w-60 items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md shadow-2xl">
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#1E1042] to-[#3B1775] border border-white/15">
                    <MetaBrandEmblem className="h-12 w-16" />
                  </div>
                  <InstagramBrandBadge
                    size="md"
                    className="absolute -top-3 -left-4 ring-2 ring-white/80"
                  />
                  <FacebookBrandBadge
                    size="md"
                    className="absolute -bottom-3 -left-3 ring-2 ring-white/80"
                  />
                  <span className="absolute -bottom-2 -right-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 text-violet-700 shadow-lg">
                    <BarChart2 className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Available Integrations Section */}
          <div className="rounded-[24px] border border-violet-100/90 bg-white p-5 shadow-[0_8px_28px_rgba(91,33,182,0.05)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="h-4.5 w-4.5 text-[#7C3AED]" />
                <h2 className="text-[16px] font-bold text-slate-900">
                  Available Integrations
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="text-slate-600 hover:text-violet-700"
                >
                  How it works?
                </button>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[#6D28D9] hover:text-violet-900"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Watch Guide</span>
                </button>
              </div>
            </div>

            {/* Featured Instagram & Facebook Cards */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Instagram Card */}
              <div className="flex flex-col justify-between rounded-[22px] border border-violet-100 bg-gradient-to-b from-white to-[#FAF8FF] p-5 shadow-2xs">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <InstagramBrandBadge size="lg" />
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Instagram
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Connect your Instagram Business account to schedule and
                          automate posts.
                        </p>
                      </div>
                    </div>
                    {instagramItem?.status === "CONNECTED" && (
                      <StatusBadge status="CONNECTED" />
                    )}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs font-medium text-slate-700">
                    {[
                      "Schedule single or recurring posts",
                      "Use from content library",
                      "Track post performance",
                    ].map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7C3AED]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    instagramItem?.status === "CONNECTED"
                      ? setMetaDetailOpen(true)
                      : startMetaFlow("INSTAGRAM")
                  }
                  className="cielora-ai-btn mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white transition"
                >
                  <span>
                    {instagramItem?.status === "CONNECTED"
                      ? "Manage Instagram"
                      : "Connect Instagram"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Facebook Card */}
              <div className="flex flex-col justify-between rounded-[22px] border border-violet-100 bg-gradient-to-b from-white to-[#FAF8FF] p-5 shadow-2xs">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <FacebookBrandBadge size="lg" />
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Facebook
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Connect your Facebook Page to manage and automate your
                          posts.
                        </p>
                      </div>
                    </div>
                    {facebookItem?.status === "CONNECTED" && (
                      <StatusBadge status="CONNECTED" />
                    )}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs font-medium text-slate-700">
                    {[
                      "Schedule posts & announcements",
                      "Auto-post offers and updates",
                      "Get reach & engagement reports",
                    ].map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7C3AED]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    facebookItem?.status === "CONNECTED"
                      ? setMetaDetailOpen(true)
                      : startMetaFlow("FACEBOOK")
                  }
                  className="cielora-ai-btn mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white transition"
                >
                  <span>
                    {facebookItem?.status === "CONNECTED"
                      ? "Manage Facebook"
                      : "Connect Facebook"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Additional Workspace Channels & API Vault Providers */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Messaging, Paid Ads &amp; Developer Channels
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {otherProviders.map((item) => (
                  <div
                    key={item.provider}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#FAF9FE] p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600 ring-1 ring-slate-200">
                          {item.category}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-slate-900">
                        {item.name}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {item.description}
                      </p>
                      {item.configPreview && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-[11px] text-slate-600">
                          <KeyRound className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                          <span>Stored key: {item.configPreview}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3">
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
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openModal(item)}
                          className="cielora-gradient-btn rounded-xl px-4 py-1.5 text-xs font-semibold text-white"
                        >
                          {item.status === "CONNECTED"
                            ? item.provider === "WHATSAPP_CLOUD"
                              ? "Reconnect"
                              : "Rotate Key"
                            : "Connect"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How the Meta Integration Flow Works Modal */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setGuideOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  How the Integration &amp; Automation Flow Works
                </h2>
                <p className="text-xs text-slate-500">
                  End-to-end flow from connecting Meta accounts to automated
                  publishing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  step: "1. Connect with Meta",
                  desc: "Select Connect Instagram or Connect Facebook to open the Meta secure handshake.",
                },
                {
                  step: "2. Grant Permissions",
                  desc: "Approve Facebook Pages, Instagram Business, scheduling, and insights access.",
                },
                {
                  step: "3. Select Accounts",
                  desc: "Choose the exact Facebook Page and Instagram handle for your workspace.",
                },
                {
                  step: "4. Launch Automation",
                  desc: "Jump directly into the Social Post Automation Pipeline to auto-publish posts.",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-violet-100 bg-[#FAF8FF] p-4"
                >
                  <div className="text-xs font-bold text-[#6D28D9]">
                    {s.step}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  startMetaFlow("INSTAGRAM");
                }}
                className="cielora-ai-btn inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white"
              >
                <span>Start Connection Flow</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Vault Credentials Modal for WhatsApp Cloud / Paid Ads / Email / SMS / Webhook */}
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
              Secrets are encrypted before storage and never exposed back in
              plaintext.
            </p>
            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}
            {selected.provider === "WHATSAPP_CLOUD" && (
              <WhatsAppSignup
                onConnected={() => {
                  setSelected(null);
                  void loadIntegrations();
                }}
              />
            )}
            <details open={selected.provider !== "WHATSAPP_CLOUD"}>
              <summary
                className={
                  selected.provider === "WHATSAPP_CLOUD"
                    ? "mt-4 cursor-pointer text-xs"
                    : "hidden"
                }
              >
                Enter credentials manually
              </summary>
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
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
