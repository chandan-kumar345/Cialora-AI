import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { generateOpaqueToken, sha256Hex } from "@/lib/crypto";
import { extractRequestMeta, writeAuditLog } from "@/lib/auth";
import {
  apiError,
  checkRateLimit,
  getClientIp,
  validateCsrfOrigin,
} from "@/lib/security";
import { forgotPasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrfOrigin(request)) {
      return apiError("Invalid request origin.", 403);
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`auth:forgot:${ip}`, 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const data = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, email: true },
    });

    if (user) {
      const rawToken = generateOpaqueToken(32);
      const tokenHash = sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const meta = extractRequestMeta(request);
      await writeAuditLog({
        userId: user.id,
        actorEmail: user.email,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "PasswordResetToken",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      if (process.env.NODE_ENV !== "production") {
        console.info(
          `[DEV_PASSWORD_RESET] Reset path for ${user.email}: /reset-password?token=${rawToken}`
        );
      }
    }

    return NextResponse.json({
      message:
        "If an account with that email exists, password reset instructions have been issued.",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError(err.issues[0]?.message ?? "Invalid email.", 400);
    }
    if (err instanceof SyntaxError) {
      return apiError("Malformed JSON payload.", 400);
    }
    console.error("[FORGOT_PASSWORD_ERROR]", err);
    return apiError("Unable to process password reset request.", 500);
  }
}
