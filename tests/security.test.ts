import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  maskSecret,
  verifyPassword,
} from "../src/lib/crypto";
import {
  formatCurrency,
  getTimeOfDayGreeting,
  toMinorUnits,
} from "../src/lib/format";
import {
  checkRateLimit,
  isSafeHttpUrl,
  isSafeRedirectPath,
  resetRateLimitsForTests,
  sanitizeCsvCell,
  validateCsrfOrigin,
} from "../src/lib/security";
import { campaignCreateSchema } from "../src/lib/validation";

describe("Security & Global Formatting Unit Tests", () => {
  it("hashes and verifies passwords with scrypt and rejects invalid passwords/hashes", async () => {
    const hash = await hashPassword("Str0ng!Pass#2026");
    assert.ok(hash.startsWith("scrypt$"));
    assert.equal(await verifyPassword("Str0ng!Pass#2026", hash), true);
    assert.equal(await verifyPassword("WrongPassword1!", hash), false);
    assert.equal(await verifyPassword("Str0ng!Pass#2026", "malformed"), false);
  });

  it("encrypts and decrypts secrets with AES-256-GCM and detects tampering", () => {
    const secret = "whsec_live_super_secret_token_987654";
    const encrypted = encryptSecret(secret);
    assert.ok(encrypted.startsWith("v1:"));
    assert.equal(decryptSecret(encrypted), secret);
    assert.equal(maskSecret(secret), "••••••••7654");

    const parts = encrypted.split(":");
    parts[3] = parts[3].slice(0, -2) + "AA";
    assert.throws(() => decryptSecret(parts.join(":")));
  });

  it("neutralizes CSV formula injection payloads", () => {
    assert.equal(sanitizeCsvCell("=CMD('calc')"), `"'=CMD('calc')"`);
    assert.equal(sanitizeCsvCell("+1+2"), `"'+1+2"`);
    assert.equal(sanitizeCsvCell("-100"), `"'-100"`);
    assert.equal(sanitizeCsvCell("@SUM(A1:A2)"), `"'@SUM(A1:A2)"`);
    assert.equal(sanitizeCsvCell('Normal "User"'), `'"Normal ""User"""'`.slice(1, -1));
  });

  it("validates URLs and post-login redirect paths safely", () => {
    assert.equal(isSafeHttpUrl("https://app.cielora.ai/hook"), true);
    assert.equal(isSafeHttpUrl("http://localhost:3000/test"), true);
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpUrl("data:text/html,<script>"), false);

    assert.equal(isSafeRedirectPath("/dashboard"), true);
    assert.equal(isSafeRedirectPath("/leads?stage=NEW"), true);
    assert.equal(isSafeRedirectPath("//evil.example"), false);
    assert.equal(isSafeRedirectPath("https://evil.example"), false);
  });

  it("enforces CSRF origin and Sec-Fetch-Site validation on mutations", () => {
    const validReq = new NextRequest("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      },
    });
    assert.equal(validateCsrfOrigin(validReq), true);

    const crossOriginReq = new NextRequest("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://attacker.example",
      },
    });
    assert.equal(validateCsrfOrigin(crossOriginReq), false);

    const crossSiteFetch = new NextRequest("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "sec-fetch-site": "cross-site",
      },
    });
    assert.equal(validateCsrfOrigin(crossSiteFetch), false);
  });

  it("enforces sliding-window rate limiting", () => {
    resetRateLimitsForTests();
    const key = "test:login:1.2.3.4";
    assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
    assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
    const blocked = checkRateLimit(key, 2, 60_000);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
  });

  it("formats global currencies including zero-decimal JPY and timezone greetings", () => {
    assert.equal(toMinorUnits(125.5, "USD"), 12550);
    assert.equal(toMinorUnits(5000, "JPY"), 5000);
    assert.match(formatCurrency(12550, "USD", "en-US"), /\$125\.50/);
    assert.match(formatCurrency(5000, "JPY", "ja-JP"), /5,000/);

    const morningUtc = new Date("2026-11-26T09:00:00.000Z");
    assert.equal(getTimeOfDayGreeting("UTC", morningUtc), "Good Morning");
    const eveningTokyo = new Date("2026-11-26T10:00:00.000Z"); // 19:00 JST
    assert.equal(getTimeOfDayGreeting("Asia/Tokyo", eveningTokyo), "Good Evening");
  });

  it("rejects unsafe campaign media and action URLs while allowing safe formats", () => {
    const svgReject = campaignCreateSchema.safeParse({
      name: "Unsafe SVG Test",
      channel: "WHATSAPP",
      type: "MARKETING",
      mediaType: "IMAGE",
      mediaUrl: "data:image/svg+xml;base64,PHN2Zz4=",
    });
    assert.equal(svgReject.success, false);

    const jsActionReject = campaignCreateSchema.safeParse({
      name: "Unsafe Action Test",
      channel: "WHATSAPP",
      type: "MARKETING",
      actions: [
        { type: "VISIT_WEBSITE", label: "Click", url: "javascript:alert(1)" },
      ],
    });
    assert.equal(jsActionReject.success, false);

    const validRaster = campaignCreateSchema.safeParse({
      name: "Festive Jewellery Offer",
      channel: "WHATSAPP",
      type: "MARKETING",
      mediaType: "IMAGE",
      mediaUrl: "data:image/png;base64,iVBORw0KGgo=",
      footerText: "Cielora Jewellery",
      actions: [
        { type: "VISIT_WEBSITE", label: "Shop collection", url: "https://cielora.ai" },
      ],
    });
    assert.equal(validRaster.success, true);
  });
});
