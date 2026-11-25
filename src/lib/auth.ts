import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { generateOpaqueToken, sha256Hex } from "@/lib/crypto";
import {
  apiError,
  checkRateLimit,
  getClientIp,
  getUserAgent,
  validateCsrfOrigin,
} from "@/lib/security";

export const SESSION_COOKIE_NAME = "cielora_session";

const SHORT_SESSION_MS = 24 * 60 * 60 * 1000;
const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export interface SafeAuthUser {
  id: string;
  email: string;
  fullName: string;
  workspaceName: string;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  language: string;
  planTier: string;
  createdAt: Date;
}

export interface AuthContext {
  user: SafeAuthUser;
  sessionId: string;
}

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

function shouldSetSecureCookie(request?: NextRequest | Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  if (!request) return true;
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto === "https";
  return request.url.startsWith("https://");
}

export function setSessionCookie(
  response: NextResponse,
  rawToken: string,
  expiresAt: Date,
  request?: NextRequest | Request
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldSetSecureCookie(request),
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(
  response: NextResponse,
  request?: NextRequest | Request
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldSetSecureCookie(request),
    path: "/",
    maxAge: 0,
  });
}

export async function createUserSession(
  userId: string,
  options: { rememberMe?: boolean; ipAddress?: string; userAgent?: string }
) {
  const rawToken = generateOpaqueToken(32);
  const tokenHash = sha256Hex(rawToken);
  const rememberMe = Boolean(options.rememberMe);
  const ttlMs = rememberMe ? REMEMBER_SESSION_MS : SHORT_SESSION_MS;
  const expiresAt = new Date(Date.now() + ttlMs);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      rememberMe,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
      expiresAt,
    },
  });

  return { rawToken, session, expiresAt };
}

export async function getAuthContextByToken(
  rawToken: string | undefined | null
): Promise<AuthContext | null> {
  if (!rawToken || rawToken.length < 16) {
    return null;
  }
  const tokenHash = sha256Hex(rawToken);
  const now = new Date();

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          workspaceName: true,
          country: true,
          currency: true,
          locale: true,
          timezone: true,
          language: true,
          planTier: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session || session.revokedAt !== null || session.expiresAt <= now) {
    return null;
  }

  if (now.getTime() - session.lastActiveAt.getTime() > 5 * 60 * 1000) {
    prisma.session
      .update({
        where: { id: session.id },
        data: { lastActiveAt: now },
      })
      .catch(() => {});
  }

  return {
    user: session.user,
    sessionId: session.id,
  };
}

export async function getAuthContext(
  request?: NextRequest
): Promise<AuthContext | null> {
  let rawToken: string | undefined;
  if (request) {
    rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }
  return getAuthContextByToken(rawToken);
}

export async function requireAuthContext(
  request?: NextRequest
): Promise<AuthContext> {
  const ctx = await getAuthContext(request);
  if (!ctx) {
    throw new AuthRequiredError();
  }
  return ctx;
}

export async function revokeSessionByToken(
  rawToken: string | undefined | null
): Promise<void> {
  if (!rawToken) return;
  const tokenHash = sha256Hex(rawToken);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string
): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function writeAuditLog(params: {
  userId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        actorEmail: params.actorEmail ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch {
    // Audit logging should not break primary flow
  }
}

export async function withProtectedRoute(
  request: NextRequest,
  handler: (ctx: AuthContext) => Promise<NextResponse>,
  options?: { rateLimitMutations?: boolean }
): Promise<NextResponse> {
  try {
    if (!validateCsrfOrigin(request)) {
      return apiError("Invalid request origin.", 403);
    }

    const auth = await requireAuthContext(request);

    const method = request.method.toUpperCase();
    if (
      options?.rateLimitMutations !== false &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      const rl = checkRateLimit(
        `api:${auth.user.id}:${getClientIp(request)}`,
        120,
        60 * 1000
      );
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSeconds) },
          }
        );
      }
    }

    return await handler(auth);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return apiError("Authentication required.", 401);
    }
    if (err instanceof ZodError) {
      return apiError("Validation failed.", 400, {
        issues: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    if (err instanceof SyntaxError) {
      return apiError("Malformed JSON payload.", 400);
    }
    console.error("[API_ERROR]", err);
    return apiError("An unexpected internal error occurred.", 500);
  }
}

export function extractRequestMeta(request: NextRequest | Request) {
  return {
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  };
}
