"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  Megaphone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { AuthShowcaseArt, CieloraLogo } from "@/components/BrandArtwork";
import { MetaInfinityIcon } from "@/components/ChannelBadge";
import { GLOBAL_COUNTRIES, GLOBAL_CURRENCIES } from "@/lib/format";
import { isSafeRedirectPath } from "@/lib/security";

type AuthMode = "login" | "register" | "forgot" | "reset";

export function AuthExperience({
  initialMode = "login",
  resetToken = "",
}: {
  initialMode?: AuthMode;
  resetToken?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [country, setCountry] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [locale, setLocale] = useState("en-US");
  const [timezone, setTimezone] = useState("UTC");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTz) setTimezone(detectedTz);
    } catch {
      // Fallback to UTC
    }

    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.googleEnabled === "boolean") {
          setGoogleEnabled(d.googleEnabled);
        }
      })
      .catch(() => {});

    const errCode = searchParams.get("error");
    if (errCode === "google_not_configured") {
      setError(
        "Google OAuth is not configured on this server yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing). Use email and password sign-in."
      );
    } else if (errCode) {
      setError("OAuth sign-in could not be completed. Please try again.");
    }
  }, [searchParams]);

  const handleCountryChange = (code: string) => {
    setCountry(code);
    const match = GLOBAL_COUNTRIES.find((c) => c.code === code);
    if (match) {
      setCurrency(match.currency);
      setLocale(match.locale);
    }
  };

  const passwordRules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, rememberMe }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Sign in failed.");
          return;
        }
        const nextParam = searchParams.get("next") ?? "/dashboard";
        const safeNext = isSafeRedirectPath(nextParam) ? nextParam : "/dashboard";
        router.push(safeNext);
        router.refresh();
      } else if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            workspaceName,
            email,
            password,
            country,
            currency,
            locale,
            timezone,
            rememberMe,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Unable to create workspace.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } else if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Request failed.");
          return;
        }
        setNotice(
          data.message ??
            "If an account exists, password reset instructions have been issued."
        );
      } else if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Reset failed.");
          return;
        }
        setNotice(data.message ?? "Password updated. You may now sign in.");
        setMode("login");
        setPassword("");
      }
    } catch {
      setError("Network error. Please verify your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!googleEnabled) {
      setError(
        "Google OAuth is ready to enable via GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env. Please sign in or create an account with email below."
      );
      return;
    }
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="cielora-auth-bg relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-8 sm:px-8 lg:px-14">
      {/* Translucent sweeping diagonal curves matching mockup */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="authArc1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DDD6FE" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="authArc2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F5D0FE" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#DBEAFE" stopOpacity="0.32" />
          </linearGradient>
        </defs>
        <path
          d="M 520 -40 C 320 260, 440 620, 120 940 L -80 940 L -80 -40 Z"
          fill="url(#authArc1)"
        />
        <path
          d="M 960 -40 C 780 280, 960 660, 1480 860 L 1480 -40 Z"
          fill="url(#authArc2)"
        />
      </svg>

      <div className="relative z-10 mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Showcase Column */}
        <div className="flex flex-col items-start lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/85 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_6px_18px_rgba(124,58,237,0.08)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            <span>AI-Powered Marketing Platform</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#0E0B24] sm:text-5xl lg:text-[50px] lg:leading-[1.12]">
            Run Smarter Campaigns,
            <span className="mt-0.5 block italic bg-gradient-to-r from-[#6D28D9] via-[#B026D3] to-[#EC4899] bg-clip-text text-transparent">
              Grow Faster
            </span>
          </h1>

          <p className="mt-4 max-w-[500px] text-[15px] leading-[1.55] text-slate-700 sm:text-[17px]">
            An all-in-one marketing suite to create campaigns, run ads, engage
            customers, and turn leads into real business growth.
          </p>

          {/* 4 Capability Pills matching mockup */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/95 bg-white/85 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.05)] backdrop-blur">
              <Megaphone className="h-4 w-4 text-violet-600" />
              <span>Campaigns</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/95 bg-white/85 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.05)] backdrop-blur">
              <MetaInfinityIcon className="h-4 w-5 text-[#0081FB]" />
              <span>Ads</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/95 bg-white/85 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.05)] backdrop-blur">
              <Layers className="h-4 w-4 text-violet-600" />
              <span>Social Media</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/95 bg-white/85 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.05)] backdrop-blur">
              <Users className="h-4 w-4 text-violet-600" />
              <span>Leads CRM</span>
            </div>
          </div>

          {/* High-res 3D Isometric Showcase Artwork */}
          <div className="mt-6 w-full flex justify-center lg:justify-start">
            <AuthShowcaseArt />
          </div>
        </div>

        {/* Right Elevated White Auth Card */}
        <div className="w-full lg:col-span-5">
          <div className="mx-auto w-full max-w-[445px] rounded-[28px] border border-white bg-white/96 px-7 py-8 shadow-[0_26px_70px_-16px_rgba(79,70,229,0.22)] backdrop-blur sm:px-9 sm:py-9">
            <div className="flex justify-center">
              <CieloraLogo darkText showTagline />
            </div>

            <div className="mt-6">
              <h2 className="text-[24px] font-extrabold tracking-tight text-[#0D0A25]">
                {mode === "login" && "Welcome Back 👋"}
                {mode === "register" && "Create Your Workspace ✨"}
                {mode === "forgot" && "Reset Your Password"}
                {mode === "reset" && "Choose a New Password"}
              </h2>
              <p className="mt-1 text-[13.5px] text-slate-500">
                {mode === "login" && "Log in to your Cielora AI workspace"}
                {mode === "register" &&
                  "Launch an isolated global marketing workspace"}
                {mode === "forgot" &&
                  "Enter your account email to receive recovery instructions"}
                {mode === "reset" &&
                  "Enter a strong new password for your workspace"}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700"
              >
                {notice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              {mode === "register" && (
                <>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                      aria-label="Full name"
                      className="w-full rounded-xl border border-slate-200/90 bg-[#F8F9FC] py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="Workspace or business name"
                      aria-label="Workspace or business name"
                      className="w-full rounded-xl border border-slate-200/90 bg-[#F8F9FC] py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </>
              )}

              {mode !== "reset" && (
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    aria-label="Email address"
                    className="w-full rounded-xl border border-slate-200/90 bg-[#F8F9FC] py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              )}

              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "reset"
                        ? "Enter new strong password"
                        : "Enter your password"
                    }
                    aria-label="Password"
                    className="w-full rounded-xl border border-slate-200/90 bg-[#F8F9FC] py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              {(mode === "register" || mode === "reset") && password.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-[11px]">
                  {[
                    { ok: passwordRules.length, label: "8+ characters" },
                    { ok: passwordRules.upper, label: "Uppercase letter" },
                    { ok: passwordRules.lower, label: "Lowercase letter" },
                    { ok: passwordRules.number, label: "Number" },
                    { ok: passwordRules.special, label: "Special symbol" },
                  ].map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-1.5 ${
                        rule.ok ? "text-emerald-600 font-medium" : "text-slate-400"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {mode === "register" && (
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Region
                    </label>
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      aria-label="Country or region"
                      className="w-full rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
                    >
                      {GLOBAL_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      aria-label="Workspace currency"
                      className="w-full rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
                    >
                      {GLOBAL_CURRENCIES.map((cur) => (
                        <option key={cur.code} value={cur.code}>
                          {cur.code} ({cur.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#6D28D9]"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setMode("forgot");
                    }}
                    className="font-semibold text-[#7C3AED] hover:text-violet-800"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="cielora-gradient-btn mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60"
              >
                <span>
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                      ? "Log In"
                      : mode === "register"
                        ? "Create Workspace"
                        : mode === "forgot"
                          ? "Send Recovery Instructions"
                          : "Update Password"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {(mode === "login" || mode === "register") && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-500">or</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 shadow-[0_2px_6px_rgba(15,23,42,0.03)] transition hover:bg-slate-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}

            <div className="mt-6 text-center text-[13px] text-slate-600">
              {mode === "login" && (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setMode("register");
                    }}
                    className="font-bold text-[#7C3AED] hover:text-violet-800"
                  >
                    Sign Up
                  </button>
                </>
              )}
              {mode === "register" && (
                <>
                  Already have a workspace?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setMode("login");
                    }}
                    className="font-bold text-[#7C3AED] hover:text-violet-800"
                  >
                    Log In
                  </button>
                </>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <Link
                  href="/login"
                  onClick={() => setMode("login")}
                  className="font-bold text-[#7C3AED] hover:text-violet-800"
                >
                  Back to Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
