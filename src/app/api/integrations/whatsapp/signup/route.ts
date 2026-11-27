import { NextRequest } from "next/server";
import { z } from "zod";
import { extractRequestMeta, withProtectedRoute, writeAuditLog } from "@/lib/auth";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/security";

const id = z.string().regex(/^\d{1,32}$/);
const signup = z.object({ code: z.string().min(1).max(8192), wabaId: id, phoneNumberId: id });

function configuration() {
  const publicConfig = z.object({
    appId: id, configId: id, solutionId: id, version: z.string().regex(/^v\d+\.\d+$/),
  }).safeParse({
    appId: process.env.META_APP_ID,
    configId: process.env.META_LOGIN_CONFIG_ID,
    solutionId: process.env.META_PARTNER_SOLUTION_ID,
    version: process.env.META_GRAPH_VERSION || "v27.0",
  });
  return publicConfig.success && process.env.META_APP_SECRET ? publicConfig.data : null;
}

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async () => {
    const config = configuration();
    return config ? apiOk(config) : apiError("Ask your administrator to configure Meta partner signup.", 503);
  });
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return apiError("Expected JSON.", 415);
    }
    const config = configuration();
    if (!config) return apiError("Meta partner signup is not configured.", 503);
    const { code, wabaId, phoneNumberId } = signup.parse(await request.json());
    const graph = "https://graph.facebook.com/" + config.version;
    let token: string;
    try {
      const exchange = await fetch(graph + "/oauth/access_token", {
        method: "POST",
        body: new URLSearchParams({ client_id: config.appId, client_secret: process.env.META_APP_SECRET!, code }),
        cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (!exchange.ok) return apiError("Meta declined the signup code. Restart Facebook signup.", 400);
      const result = await exchange.json();
      if (typeof result.access_token !== "string" || !result.access_token) {
        return apiError("Meta did not return an access token.", 502);
      }
      token = result.access_token;
      const numbers = new URL(graph + "/" + wabaId + "/phone_numbers");
      numbers.searchParams.set("fields", "id");
      numbers.searchParams.set("limit", "100");
      const seen = new Set<string>();
      for (;;) {
        const response = await fetch(numbers, {
          headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return apiError("Meta could not verify access to this WhatsApp account.", 400);
        const page = await response.json();
        if (Array.isArray(page.data) && page.data.some((phone: { id: string }) => phone.id === phoneNumberId)) break;
        const after = page.paging?.cursors?.after;
        if (!page.paging?.next || typeof after !== "string" || seen.has(after)) {
          return apiError("The selected phone number could not be verified for this WhatsApp account.", 400);
        }
        seen.add(after);
        numbers.searchParams.set("after", after);
      }
    } catch {
      return apiError("Unable to reach Meta. Restart signup and try again.", 502);
    }
    const provider = "WHATSAPP_CLOUD";
    const data = {
      encryptedConfig: encryptSecret(JSON.stringify({ apiKey: token, accountId: phoneNumberId, wabaId, solutionId: config.solutionId })),
      configPreview: maskSecret(token), lastSyncedAt: new Date(), status: "CONNECTED",
    };
    await prisma.integrationConnection.upsert({
      where: { userId_provider: { userId: user.id, provider } },
      update: data,
      create: { userId: user.id, provider, displayName: "WhatsApp Cloud API", ...data },
    });
    await writeAuditLog({ userId: user.id, actorEmail: user.email, action: "INTEGRATION_CONNECTED",
      entityType: "IntegrationConnection", entityId: provider, ...extractRequestMeta(request) });
    return apiOk({ connected: true });
  });
}
