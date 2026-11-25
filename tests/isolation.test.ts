import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db";
import { SESSION_COOKIE_NAME } from "../src/lib/auth";
import { POST as registerRoute } from "../src/app/api/auth/register/route";
import { GET as meRoute } from "../src/app/api/auth/me/route";
import {
  GET as campaignsListRoute,
  POST as campaignsCreateRoute,
} from "../src/app/api/campaigns/route";
import {
  DELETE as campaignDeleteRoute,
  GET as campaignGetRoute,
  PATCH as campaignPatchRoute,
} from "../src/app/api/campaigns/[id]/route";
import { POST as campaignEventsRoute } from "../src/app/api/campaigns/[id]/events/route";
import { GET as perfRoute } from "../src/app/api/analytics/performance/route";
import { GET as overviewRoute } from "../src/app/api/analytics/overview/route";
import {
  GET as leadsListRoute,
  POST as leadsCreateRoute,
} from "../src/app/api/leads/route";
import {
  DELETE as leadDeleteRoute,
  PATCH as leadPatchRoute,
} from "../src/app/api/leads/[id]/route";
import { GET as leadsExportRoute } from "../src/app/api/leads/export/route";
import {
  GET as integrationsListRoute,
} from "../src/app/api/integrations/route";
import { PUT as integrationPutRoute } from "../src/app/api/integrations/[provider]/route";
import { GET as searchRoute } from "../src/app/api/search/route";
import { GET as reportsRoute } from "../src/app/api/reports/route";

function makeReq(
  url: string,
  options: { method?: string; cookie?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = {
    host: "localhost:3000",
    origin: "http://localhost:3000",
  };
  if (options.cookie) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${options.cookie}`;
  }
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  return new NextRequest(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("User-Wise Isolation & Zero-Dummy-Data Integration Tests", () => {
  const runId = crypto.randomBytes(4).toString("hex");
  const emailA = `isolation-a-${runId}@example.com`;
  const emailB = `isolation-b-${runId}@example.com`;
  let cookieA = "";
  let cookieB = "";
  let campaignIdA = "";
  let leadIdA = "";

  after(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await campaignsListRoute(
      makeReq("http://localhost:3000/api/campaigns")
    );
    assert.equal(res.status, 401);

    const meRes = await meRoute(makeReq("http://localhost:3000/api/auth/me"));
    assert.equal(meRes.status, 401);
  });

  it("registers two isolated global users with zero pre-populated dummy data", async () => {
    const resA = await registerRoute(
      makeReq("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          fullName: "Alice Global",
          workspaceName: "Alice SaaS",
          email: emailA,
          password: "UserA!Strong#2026",
          country: "US",
          currency: "USD",
          locale: "en-US",
          timezone: "America/New_York",
        },
      })
    );
    assert.equal(resA.status, 201);
    cookieA = resA.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    assert.ok(cookieA.length > 20);

    const resB = await registerRoute(
      makeReq("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          fullName: "Bob Europe",
          workspaceName: "Bob GmbH",
          email: emailB,
          password: "UserB!Strong#2026",
          country: "DE",
          currency: "EUR",
          locale: "de-DE",
          timezone: "Europe/Berlin",
        },
      })
    );
    assert.equal(resB.status, 201);
    cookieB = resB.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    assert.ok(cookieB.length > 20);

    // Zero dummy data check for User A
    const perfA = await (
      await perfRoute(
        makeReq("http://localhost:3000/api/analytics/performance?range=30d", {
          cookie: cookieA,
        })
      )
    ).json();
    assert.equal(perfA.hasData, false);
    assert.equal(perfA.totals.sent, 0);
    assert.equal(perfA.totals.revenueCents, 0);

    const ovA = await (
      await overviewRoute(
        makeReq("http://localhost:3000/api/analytics/overview", {
          cookie: cookieA,
        })
      )
    ).json();
    assert.equal(ovA.total, 0);
  });

  it("creates real records under User A and reflects them dynamically in User A APIs", async () => {
    const createCamp = await campaignsCreateRoute(
      makeReq("http://localhost:3000/api/campaigns", {
        method: "POST",
        cookie: cookieA,
        body: {
          name: `Secret Alpha Launch ${runId}`,
          channel: "WHATSAPP",
          type: "MARKETING",
          status: "ACTIVE",
          budgetCents: 250000,
        },
      })
    );
    assert.equal(createCamp.status, 201);
    const campJson = await createCamp.json();
    campaignIdA = campJson.campaign.id;

    const eventRes = await campaignEventsRoute(
      makeReq(`http://localhost:3000/api/campaigns/${campaignIdA}/events`, {
        method: "POST",
        cookie: cookieA,
        body: {
          sentCount: 1000,
          deliveredCount: 950,
          clickCount: 120,
          leadCount: 18,
          revenueCents: 450000,
        },
      }),
      { params: Promise.resolve({ id: campaignIdA }) }
    );
    assert.equal(eventRes.status, 201);

    const createLead = await leadsCreateRoute(
      makeReq("http://localhost:3000/api/leads", {
        method: "POST",
        cookie: cookieA,
        body: {
          fullName: `Enterprise Buyer ${runId}`,
          email: `buyer-${runId}@acme.example`,
          phone: "+14155550199",
          estimatedValueCents: 100000,
          campaignId: campaignIdA,
        },
      })
    );
    assert.equal(createLead.status, 201);
    leadIdA = (await createLead.json()).lead.id;

    const intRes = await integrationPutRoute(
      makeReq("http://localhost:3000/api/integrations/WHATSAPP_CLOUD", {
        method: "PUT",
        cookie: cookieA,
        body: {
          displayName: "Alice WhatsApp Prod",
          apiKey: "eaab_super_secret_key_9988",
        },
      }),
      { params: Promise.resolve({ provider: "WHATSAPP_CLOUD" }) }
    );
    assert.equal(intRes.status, 200);
    const intJson = await intRes.json();
    assert.equal(intJson.integration.configPreview, "••••••••9988");
    assert.equal("encryptedConfig" in intJson.integration, false);

    // User A sees live aggregates
    const perfA = await (
      await perfRoute(
        makeReq("http://localhost:3000/api/analytics/performance?range=30d", {
          cookie: cookieA,
        })
      )
    ).json();
    assert.equal(perfA.hasData, true);
    assert.equal(perfA.totals.sent, 1000);
    assert.equal(perfA.totals.delivered, 950);
    assert.equal(perfA.totals.clicks, 120);
    assert.equal(perfA.totals.leads, 19); // 18 event + 1 linked lead
    assert.equal(perfA.totals.revenueCents, 450000);
  });

  it("completely isolates User B from User A data across reads, writes, searches, and exports", async () => {
    // Lists & aggregates for User B remain empty/zero
    const listB = await (
      await campaignsListRoute(
        makeReq("http://localhost:3000/api/campaigns", { cookie: cookieB })
      )
    ).json();
    assert.equal(listB.campaigns.length, 0);

    const perfB = await (
      await perfRoute(
        makeReq("http://localhost:3000/api/analytics/performance?range=30d", {
          cookie: cookieB,
        })
      )
    ).json();
    assert.equal(perfB.hasData, false);
    assert.equal(perfB.totals.sent, 0);

    const leadsB = await (
      await leadsListRoute(
        makeReq("http://localhost:3000/api/leads", { cookie: cookieB })
      )
    ).json();
    assert.equal(leadsB.leads.length, 0);

    const searchB = await (
      await searchRoute(
        makeReq(`http://localhost:3000/api/search?q=${runId}`, {
          cookie: cookieB,
        })
      )
    ).json();
    assert.equal(searchB.campaigns.length, 0);
    assert.equal(searchB.leads.length, 0);

    const reportB = await (
      await reportsRoute(
        makeReq("http://localhost:3000/api/reports?range=30d", {
          cookie: cookieB,
        })
      )
    ).json();
    assert.equal(reportB.overview.total, 0);
    assert.equal(reportB.totalLeads, 0);

    const intB = await (
      await integrationsListRoute(
        makeReq("http://localhost:3000/api/integrations", { cookie: cookieB })
      )
    ).json();
    const waB = intB.integrations.find(
      (i: { provider: string }) => i.provider === "WHATSAPP_CLOUD"
    );
    assert.equal(waB.status, "DISCONNECTED");
    assert.equal(waB.configPreview, null);

    // Cross-user IDOR attempts fail closed with 404
    const getCross = await campaignGetRoute(
      makeReq(`http://localhost:3000/api/campaigns/${campaignIdA}`, {
        cookie: cookieB,
      }),
      { params: Promise.resolve({ id: campaignIdA }) }
    );
    assert.equal(getCross.status, 404);

    const patchCross = await campaignPatchRoute(
      makeReq(`http://localhost:3000/api/campaigns/${campaignIdA}`, {
        method: "PATCH",
        cookie: cookieB,
        body: { name: "Hijacked" },
      }),
      { params: Promise.resolve({ id: campaignIdA }) }
    );
    assert.equal(patchCross.status, 404);

    const delCross = await campaignDeleteRoute(
      makeReq(`http://localhost:3000/api/campaigns/${campaignIdA}`, {
        method: "DELETE",
        cookie: cookieB,
      }),
      { params: Promise.resolve({ id: campaignIdA }) }
    );
    assert.equal(delCross.status, 404);

    const eventCross = await campaignEventsRoute(
      makeReq(`http://localhost:3000/api/campaigns/${campaignIdA}/events`, {
        method: "POST",
        cookie: cookieB,
        body: { sentCount: 500 },
      }),
      { params: Promise.resolve({ id: campaignIdA }) }
    );
    assert.equal(eventCross.status, 404);

    const linkCrossLead = await leadsCreateRoute(
      makeReq("http://localhost:3000/api/leads", {
        method: "POST",
        cookie: cookieB,
        body: { fullName: "Sneaky Lead", campaignId: campaignIdA },
      })
    );
    assert.equal(linkCrossLead.status, 404);

    const patchLeadCross = await leadPatchRoute(
      makeReq(`http://localhost:3000/api/leads/${leadIdA}`, {
        method: "PATCH",
        cookie: cookieB,
        body: { stage: "LOST" },
      }),
      { params: Promise.resolve({ id: leadIdA }) }
    );
    assert.equal(patchLeadCross.status, 404);

    const delLeadCross = await leadDeleteRoute(
      makeReq(`http://localhost:3000/api/leads/${leadIdA}`, {
        method: "DELETE",
        cookie: cookieB,
      }),
      { params: Promise.resolve({ id: leadIdA }) }
    );
    assert.equal(delLeadCross.status, 404);

    // Export CSV for User B contains only header row
    const csvRes = await leadsExportRoute(
      makeReq("http://localhost:3000/api/leads/export", { cookie: cookieB })
    );
    const csvText = await csvRes.text();
    assert.equal(csvText.trim().split("\n").length, 1);
    assert.ok(!csvText.includes("Enterprise Buyer"));
  });
});
