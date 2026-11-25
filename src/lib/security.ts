import { NextRequest, NextResponse } from "next/server";

interface RateBucket {
  timestamps: number[];
}

const rateStore = new Map<string, RateBucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = rateStore.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateStore.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.timestamps.push(now);
  rateStore.set(key, bucket);

  if (rateStore.size > 5000) {
    for (const [k, b] of rateStore.entries()) {
      if (b.timestamps.every((t) => t <= cutoff)) {
        rateStore.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitsForTests(): void {
  rateStore.clear();
}

export function getClientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim().slice(0, 64);
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim().slice(0, 64);
  return "127.0.0.1";
}

export function getUserAgent(request: NextRequest | Request): string {
  return (request.headers.get("user-agent") ?? "unknown").slice(0, 256);
}

export function validateCsrfOrigin(request: NextRequest | Request): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const configuredOrigin = process.env.APP_ORIGIN?.trim();

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      if (configuredOrigin) {
        const expected = new URL(configuredOrigin);
        if (originUrl.host === expected.host) return true;
      }
      if (host && originUrl.host === host) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      const refUrl = new URL(refererHeader);
      if (configuredOrigin) {
        const expected = new URL(configuredOrigin);
        if (refUrl.host === expected.host) return true;
      }
      if (host && refUrl.host === host) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  return true;
}

export function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  const escaped = formulaSafe.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafeRedirectPath(value: string): boolean {
  return /^\/(?!\/)[^\s\\]*$/.test(value);
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(extra ?? {}),
    },
    { status }
  );
}
