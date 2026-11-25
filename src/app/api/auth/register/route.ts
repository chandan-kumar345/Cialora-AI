import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import {
  createUserSession,
  extractRequestMeta,
  setSessionCookie,
  writeAuditLog,
} from "@/lib/auth";
import {
  apiError,
  checkRateLimit,
  getClientIp,
  validateCsrfOrigin,
} from "@/lib/security";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrfOrigin(request)) {
      return apiError("Invalid request origin.", 403);
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`auth:register:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existing) {
      return apiError(
        "An account with this email already exists. Please sign in instead.",
        409
      );
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        workspaceName: data.workspaceName,
        country: data.country.toUpperCase(),
        currency: data.currency.toUpperCase(),
        locale: data.locale,
        timezone: data.timezone,
        planTier: "STARTER",
      },
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
    });

    const meta = extractRequestMeta(request);
    const { rawToken, expiresAt } = await createUserSession(user.id, {
      rememberMe: data.rememberMe,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        currency: user.currency,
        locale: user.locale,
        timezone: user.timezone,
      },
    });

    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, rawToken, expiresAt, request);
    return response;
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError(err.issues[0]?.message ?? "Invalid registration input.", 400, {
        issues: err.issues,
      });
    }
    if (err instanceof SyntaxError) {
      return apiError("Malformed JSON payload.", 400);
    }
    console.error("[REGISTER_ERROR]", err);
    return apiError("Unable to create account.", 500);
  }
}
