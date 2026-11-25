import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
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
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrfOrigin(request)) {
      return apiError("Invalid request origin.", 403);
    }

    const body = await request.json();
    const data = loginSchema.parse(body);

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`auth:login:ip:${ip}`, 15, 15 * 60 * 1000);
    const emailLimit = checkRateLimit(
      `auth:login:email:${data.email}`,
      10,
      15 * 60 * 1000
    );

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(
        ipLimit.retryAfterSeconds,
        emailLimit.retryAfterSeconds
      );
      return NextResponse.json(
        { error: "Too many login attempts. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(retry) } }
      );
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: data.email },
    });

    const passwordValid = userRecord
      ? await verifyPassword(data.password, userRecord.passwordHash)
      : false;

    if (!userRecord || !passwordValid) {
      const meta = extractRequestMeta(request);
      await writeAuditLog({
        userId: userRecord?.id ?? null,
        actorEmail: data.email,
        action: "LOGIN_FAILED",
        entityType: "Session",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return apiError("Invalid email or password.", 401);
    }

    const meta = extractRequestMeta(request);
    const { rawToken, expiresAt } = await createUserSession(userRecord.id, {
      rememberMe: data.rememberMe,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await writeAuditLog({
      userId: userRecord.id,
      actorEmail: userRecord.email,
      action: "LOGIN_SUCCEEDED",
      entityType: "Session",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const response = NextResponse.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        fullName: userRecord.fullName,
        workspaceName: userRecord.workspaceName,
        country: userRecord.country,
        currency: userRecord.currency,
        locale: userRecord.locale,
        timezone: userRecord.timezone,
        language: userRecord.language,
        planTier: userRecord.planTier,
        createdAt: userRecord.createdAt,
      },
    });

    setSessionCookie(response, rawToken, expiresAt, request);
    return response;
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError(err.issues[0]?.message ?? "Invalid login credentials.", 400);
    }
    if (err instanceof SyntaxError) {
      return apiError("Malformed JSON payload.", 400);
    }
    console.error("[LOGIN_ERROR]", err);
    return apiError("Authentication service error.", 500);
  }
}
