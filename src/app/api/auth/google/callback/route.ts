import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOpaqueToken, hashPassword } from "@/lib/crypto";
import {
  createUserSession,
  extractRequestMeta,
  setSessionCookie,
  writeAuditLog,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", request.url)
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("cielora_oauth_state")?.value;

  if (!code || !state || !savedState) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const stateBuf = Buffer.from(state, "utf8");
  const savedBuf = Buffer.from(savedState, "utf8");
  if (
    stateBuf.length !== savedBuf.length ||
    !crypto.timingSafeEqual(stateBuf, savedBuf)
  ) {
    return NextResponse.redirect(new URL("/login?error=oauth_state", request.url));
  }

  try {
    const origin = process.env.APP_ORIGIN?.trim() || new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_token", request.url)
      );
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_token", request.url)
      );
    }

    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!userInfoRes.ok) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_profile", request.url)
      );
    }

    const profile = (await userInfoRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (!profile.sub || !profile.email || !profile.email_verified) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_unverified", request.url)
      );
    }

    const email = profile.email.trim().toLowerCase();
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.sub }, { email }],
      },
    });

    if (!user) {
      const randomPassword = generateOpaqueToken(32);
      const passwordHash = await hashPassword(randomPassword);
      const fullName = profile.name?.trim() || email.split("@")[0];
      user = await prisma.user.create({
        data: {
          email,
          googleId: profile.sub,
          passwordHash,
          fullName,
          workspaceName: `${fullName}'s Workspace`,
          country: "US",
          currency: "USD",
          locale: "en-US",
          timezone: "UTC",
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub },
      });
    }

    const meta = extractRequestMeta(request);
    const { rawToken, expiresAt } = await createUserSession(user.id, {
      rememberMe: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "OAUTH_GOOGLE_LOGIN",
      entityType: "Session",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.delete("cielora_oauth_state");
    setSessionCookie(response, rawToken, expiresAt, request);
    return response;
  } catch (err) {
    console.error("[GOOGLE_OAUTH_ERROR]", err);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
}
