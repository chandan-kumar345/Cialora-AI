"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Home,
  Layers,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Search,
  Send,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  BotEmblem,
  CieloraLogo,
  CrownEmblem,
} from "@/components/BrandArtwork";
import { useWorkspace } from "@/components/WorkspaceProvider";
import {
  formatDate,
  getFirstName,
  getInitials,
  getTimeOfDayGreeting,
} from "@/lib/format";

interface SearchResults {
  campaigns: Array<{ id: string; name: string; channel: string; status: string }>;
  leads: Array<{ id: string; fullName: string; email: string | null; stage: string }>;
  socialPosts: Array<{ id: string; title: string; platform: string; status: string }>;
  adCampaigns: Array<{ id: string; name: string; platform: string; status: string }>;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

const OVERVIEW_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/campaigns", label: "Campaigns", icon: TrendingUp },
  {
    href: "/social",
    label: "Social Marketing",
    icon: Layers,
    children: [
      { href: "/social", label: "Content Studio" },
      { href: "/social?view=calendar", label: "Publish Calendar" },
    ],
  },
  { href: "/ads", label: "Ads Manager", icon: Megaphone },
  { href: "/messaging", label: "Bulk Messaging", icon: MessageSquare },
  { href: "/leads", label: "Leads CRM", icon: Users },
  { href: "/automation", label: "Automation", icon: Zap },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const SETUP_ITEMS = [
  { href: "/integrations", label: "Integrations", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    setUser,
    aiOpen,
    closeAiAssistant,
    aiInitialPrompt,
    upgradeOpen,
    setUpgradeOpen,
  } = useWorkspace();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [socialExpanded, setSocialExpanded] = useState(
    pathname.startsWith("/social")
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessages, setAiMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Ignore transient offline error
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [pathname]);

  useEffect(() => {
    if (aiInitialPrompt) {
      setAiPrompt(aiInitialPrompt);
    }
  }, [aiInitialPrompt]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          setSearchResults(await res.json());
        }
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    loadNotifications();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText = aiPrompt.trim();
    if (!promptText || aiLoading) return;
    setAiMessages((prev) => [...prev, { role: "user", text: promptText }]);
    setAiPrompt("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });
      const data = await res.json();
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            data.reply ??
            data.error ??
            "Unable to analyze workspace telemetry right now.",
        },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Network error reaching Cielora AI Assistant.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectPlan = async (planTier: "STARTER" | "PRO" | "ENTERPRISE") => {
    setPlanSaving(true);
    try {
      const res = await fetch("/api/settings/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUpgradeOpen(false);
        loadNotifications();
      }
    } finally {
      setPlanSaving(false);
    }
  };

  const greeting = getTimeOfDayGreeting(user.timezone);
  const firstName = getFirstName(user.fullName);
  const initials = getInitials(user.fullName);

  const sidebarContent = (
    <div className="cielora-sidebar-bg flex h-full w-[246px] flex-col justify-between px-4 py-5 text-white">
      <div className="space-y-5 overflow-y-auto pr-0.5">
        <Link
          href="/dashboard"
          className="block px-1.5"
          onClick={() => setMobileNavOpen(false)}
        >
          <CieloraLogo compact />
        </Link>

        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-200/45">
            Overview
          </p>
          <nav className="mt-2 space-y-1" aria-label="Main navigation">
            {OVERVIEW_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              if (item.children) {
                return (
                  <div key={item.href}>
                    <div
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                        active
                          ? "cielora-nav-active text-white font-semibold"
                          : "text-purple-100/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className="flex flex-1 items-center gap-3"
                      >
                        <Icon className="h-[17px] w-[17px] shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label="Toggle Social Marketing menu"
                        onClick={() => setSocialExpanded((v) => !v)}
                        className="p-0.5 opacity-80 hover:opacity-100"
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform ${
                            socialExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    </div>
                    {socialExpanded && (
                      <div className="mt-1 ml-7 space-y-1 border-l border-white/15 pl-3">
                        {item.children.map((sub) => (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            onClick={() => setMobileNavOpen(false)}
                            className="block rounded-lg px-2.5 py-1.5 text-xs text-purple-200/80 hover:bg-white/10 hover:text-white"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                    active
                      ? "cielora-nav-active text-white font-semibold"
                      : "text-purple-100/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-200/45">
            Setup
          </p>
          <nav className="mt-2 space-y-1" aria-label="Setup navigation">
            {SETUP_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                    active
                      ? "cielora-nav-active text-white font-semibold"
                      : "text-purple-100/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Upgrade Card matching Image 3 */}
      <div className="relative mt-6 rounded-2xl border border-purple-300/20 bg-gradient-to-b from-white/10 to-purple-950/50 p-4 backdrop-blur-md">
        <div className="absolute -top-6 right-1">
          <CrownEmblem />
        </div>
        <div className="flex items-center gap-2 text-[13px] font-bold text-white">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-400/20 text-amber-300 text-xs">
            ♛
          </span>
          <span>
            {user.planTier === "PRO"
              ? "Pro Workspace"
              : user.planTier === "ENTERPRISE"
                ? "Enterprise Plan"
                : "Upgrade to Pro"}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-purple-100/75">
          Unlock automation, AI tools and higher limits.
        </p>
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="cielora-upgrade-btn mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold text-white transition"
        >
          <span>{user.planTier === "STARTER" ? "Upgrade Now" : "Manage Plan"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  const hasSearchHits =
    searchResults &&
    (searchResults.campaigns.length > 0 ||
      searchResults.leads.length > 0 ||
      searchResults.socialPosts.length > 0 ||
      searchResults.adCampaigns.length > 0);

  return (
    <div className="flex min-h-screen bg-[#F4F5FA] text-slate-900">
      <aside className="hidden lg:block lg:w-[246px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Clean Top Header matching Image 3 */}
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-[19px] font-bold tracking-tight text-slate-900 sm:text-[21px]">
                  {greeting},{" "}
                  <span className="text-[#7C3AED]">{firstName}</span>{" "}
                  <span aria-hidden="true">👋</span>
                </h1>
                <p className="text-xs text-slate-500">
                  Here&apos;s what&apos;s happening with your marketing today.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Pill */}
              <div className="relative hidden md:block w-64 xl:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaigns, leads, reports..."
                  aria-label="Global workspace search"
                  className="w-full rounded-full border border-slate-200/90 bg-[#F8F9FC] py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                />
                {searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-11 z-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    {searching ? (
                      <p className="text-xs text-slate-500">Searching...</p>
                    ) : !hasSearchHits ? (
                      <p className="text-xs text-slate-500">
                        No matching records in your workspace.
                      </p>
                    ) : (
                      <div className="space-y-2.5 text-xs">
                        {searchResults!.campaigns.length > 0 && (
                          <div>
                            <p className="font-semibold text-slate-400 uppercase text-[10px]">
                              Campaigns
                            </p>
                            {searchResults!.campaigns.map((c) => (
                              <Link
                                key={c.id}
                                href="/campaigns"
                                onClick={() => setSearchQuery("")}
                                className="mt-1 flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
                              >
                                <span className="font-medium text-slate-800">
                                  {c.name}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {c.channel}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                        {searchResults!.leads.length > 0 && (
                          <div>
                            <p className="font-semibold text-slate-400 uppercase text-[10px]">
                              Leads CRM
                            </p>
                            {searchResults!.leads.map((l) => (
                              <Link
                                key={l.id}
                                href="/leads"
                                onClick={() => setSearchQuery("")}
                                className="mt-1 flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
                              >
                                <span className="font-medium text-slate-800">
                                  {l.fullName}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {l.stage}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                        {searchResults!.socialPosts.length > 0 && (
                          <div>
                            <p className="font-semibold text-slate-400 uppercase text-[10px]">
                              Social Posts
                            </p>
                            {searchResults!.socialPosts.map((s) => (
                              <Link
                                key={s.id}
                                href="/social"
                                onClick={() => setSearchQuery("")}
                                className="mt-1 flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
                              >
                                <span className="font-medium text-slate-800">
                                  {s.title}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {s.platform}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bell Icon */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Workspace notifications"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setProfileMenuOpen(false);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-violet-600 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-400">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`rounded-xl border p-2.5 text-xs ${
                              n.isRead
                                ? "border-slate-100 bg-slate-50/50 text-slate-600"
                                : "border-violet-100 bg-violet-50/60 text-slate-800"
                            }`}
                          >
                            <div className="font-semibold">{n.title}</div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {n.message}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">
                              {formatDate(n.createdAt, user.timezone, user.locale)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu Pill matching Image 3 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-xs font-bold text-white shadow-xs">
                    {initials}
                  </span>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-bold text-slate-900">
                      {user.fullName}
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      {user.workspaceName}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-40">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-xs font-bold text-slate-900">
                        {user.fullName}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {user.email}
                      </p>
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        <Globe className="h-3 w-3" />
                        <span>
                          {user.currency} · {user.locale} · {user.timezone}
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Global Settings &amp; Security</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-7">{children}</main>
      </div>

      {/* Cielora AI Assistant Drawer */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={closeAiAssistant}
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <BotEmblem size="sm" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Cielora AI Assistant
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Grounded strictly in {user.workspaceName}&apos;s live API data
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close AI Assistant"
                onClick={closeAiAssistant}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {aiMessages.length === 0 && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-xs leading-relaxed text-slate-700">
                  <div className="flex items-center gap-1.5 font-bold text-violet-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Ask anything about your workspace</span>
                  </div>
                  <p className="mt-1.5">
                    I analyze your isolated campaigns, delivery rates, CRM leads,
                    and automations without guessing or inventing metrics.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      "Summarize my last 30 days performance",
                      "Draft a WhatsApp launch campaign",
                      "How can I convert more CRM leads?",
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAiPrompt(q)}
                        className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "ml-8 bg-violet-600 text-white"
                      : "mr-4 border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {aiLoading && (
                <div className="mr-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Analyzing live workspace metrics...
                </div>
              )}
            </div>

            <form
              onSubmit={handleAskAi}
              className="border-t border-slate-100 p-4 flex gap-2"
            >
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask Cielora AI for insights or copy..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-violet-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="cielora-ai-btn inline-flex items-center justify-center rounded-xl px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setUpgradeOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Workspace Plan &amp; Global Limits
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Current tier:{" "}
                  <span className="font-bold text-violet-600">
                    {user.planTier}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(
                [
                  {
                    tier: "STARTER" as const,
                    title: "Starter",
                    price: "$0 / mo",
                    features: [
                      "Isolated workspace",
                      "Campaigns & Leads CRM",
                      "Global currency support",
                    ],
                  },
                  {
                    tier: "PRO" as const,
                    title: "Pro",
                    price: "$49 / mo",
                    features: [
                      "Unlimited Automation journeys",
                      "AI Campaign Assistant",
                      "Bulk Messaging & Ads sync",
                    ],
                  },
                  {
                    tier: "ENTERPRISE" as const,
                    title: "Enterprise",
                    price: "$199 / mo",
                    features: [
                      "Dedicated audit retention",
                      "Custom Webhook vault",
                      "Multi-region compliance",
                    ],
                  },
                ] as const
              ).map((plan) => {
                const isCurrent = user.planTier === plan.tier;
                return (
                  <div
                    key={plan.tier}
                    className={`flex flex-col justify-between rounded-2xl border p-4 ${
                      plan.tier === "PRO"
                        ? "border-violet-400 bg-violet-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {plan.title}
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-violet-600">
                        {plan.price}
                      </div>
                      <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      disabled={isCurrent || planSaving}
                      onClick={() => handleSelectPlan(plan.tier)}
                      className={`mt-4 w-full rounded-xl py-2 text-xs font-semibold transition ${
                        isCurrent
                          ? "bg-slate-100 text-slate-500"
                          : "cielora-gradient-btn text-white"
                      }`}
                    >
                      {isCurrent ? "Current Plan" : `Switch to ${plan.title}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
