"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Globe, Lock, Settings, Shield, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceProvider";
import {
  COMMON_TIMEZONES,
  GLOBAL_COUNTRIES,
  GLOBAL_CURRENCIES,
  GLOBAL_LOCALES,
  formatDate,
} from "@/lib/format";

interface SessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  ipAddress: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, setUser, setUpgradeOpen } = useWorkspace();

  const [fullName, setFullName] = useState(user.fullName);
  const [workspaceName, setWorkspaceName] = useState(user.workspaceName);
  const [country, setCountry] = useState(user.country);
  const [currency, setCurrency] = useState(user.currency);
  const [locale, setLocale] = useState(user.locale);
  const [timezone, setTimezone] = useState(user.timezone);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const loadSecurity = useCallback(async () => {
    const [sesRes, logRes] = await Promise.all([
      fetch("/api/settings/sessions", { cache: "no-store" }),
      fetch("/api/settings/audit-logs", { cache: "no-store" }),
    ]);
    if (sesRes.ok) {
      const d = await sesRes.json();
      setSessions(d.sessions ?? []);
    }
    if (logRes.ok) {
      const d = await logRes.json();
      setAuditLogs(d.logs ?? []);
    }
  }, []);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    setProfileSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          workspaceName,
          country,
          currency,
          locale,
          timezone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setProfileNotice(
          `Saved! Workspace now renders globally in ${data.user.currency} (${data.user.locale}, ${data.user.timezone}).`
        );
        loadSecurity();
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ type: "err", text: data.error ?? "Password update failed." });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setPwMsg({ type: "ok", text: data.message });
      loadSecurity();
    } finally {
      setPwSaving(false);
    }
  };

  const revokeSession = async (id: string) => {
    await fetch(`/api/settings/sessions/${id}`, { method: "DELETE" });
    loadSecurity();
  };

  const timezoneChoices = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Global Settings &amp; Security
            </h1>
            <p className="text-xs text-slate-500">
              Configure global currency, locale, timezone, credentials, and active session security.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
        >
          Plan Tier: {user.planTier}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Global Profile & Localization */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 space-y-4 text-xs"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Globe className="h-4 w-4 text-violet-600" />
            <span>Global Workspace &amp; Localization</span>
          </div>

          {profileNotice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
              {profileNotice}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Country / Region
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {GLOBAL_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {GLOBAL_CURRENCIES.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.code} — {cur.name} ({cur.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Number &amp; Date Locale
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {GLOBAL_LOCALES.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {timezoneChoices.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="cielora-gradient-btn rounded-xl px-5 py-2.5 font-bold text-white"
          >
            {profileSaving ? "Saving..." : "Save Global Preferences"}
          </button>
        </form>

        {/* Password Change */}
        <form
          onSubmit={handlePasswordChange}
          className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 space-y-4 text-xs"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Lock className="h-4 w-4 text-violet-600" />
            <span>Password &amp; Session Rotation</span>
          </div>

          {pwMsg && (
            <div
              className={`rounded-xl border px-3 py-2 ${
                pwMsg.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {pwMsg.text}
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-slate-700">
              New Strong Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, upper, lower, digit, symbol"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white hover:bg-slate-800"
          >
            {pwSaving ? "Updating..." : "Update Password"}
          </button>
        </form>

        {/* Active Sessions */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Shield className="h-4 w-4 text-violet-600" />
            <span>Active Sessions ({sessions.length})</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-bold text-slate-800">
                    {s.isCurrent ? "Current Browser Session" : "Active Session"}
                    <span className="ml-2 font-normal text-slate-500">
                      ({s.ipAddress || "unknown IP"})
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    {s.userAgent || "Browser"}
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => revokeSession(s.id)}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                    title="Revoke session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Security Audit Log */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 text-xs">
          <h2 className="text-sm font-bold text-slate-900">
            Security &amp; Workspace Audit Log
          </h2>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
              >
                <div>
                  <span className="font-bold text-slate-800">{log.action}</span>
                  <span className="ml-2 text-slate-500">
                    ({log.entityType})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatDate(log.createdAt, user.timezone, user.locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
