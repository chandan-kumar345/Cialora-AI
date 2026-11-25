import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, sha256Hex } from "@/lib/crypto";
import { extractRequestMeta, writeAuditLog } from "@/lib/auth";
import {
  apiError,
  checkRateLimit,
  getClientIp,
  validateCsrfOrigin,
} from "@/lib/security";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrfOrigin(request)) {
      return apiError("Invalid request origin.", 403);
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`auth:reset:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const data = resetPasswordSchema.parse(body);
    const tokenHash = sha256Hex(data.token);
    const now = new Date();

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!record || record.usedAt !== null || record.expiresAt <= now) {
      return apiError("Reset token is invalid or has expired.", 400);
    }

    const newHash = await hashPassword(data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      userId: record.userId,
      actorEmail: record.user.email,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: record.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      message: "Your password has been updated. Please sign in with your new password.",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError(err.issues[0]?.message ?? "Invalid input.", 400);
    }
    if (err instanceof SyntaxError) {
      return apiError("Malformed JSON payload.", 400);
    }
    console.error("[RESET_PASSWORD_ERROR]", err);
    return apiError("Unable to reset password.", 500);
  }
}
