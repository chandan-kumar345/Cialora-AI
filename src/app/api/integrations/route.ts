import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withProtectedRoute } from "@/lib/auth";
import { apiOk } from "@/lib/security";
import { INTEGRATION_PROVIDERS } from "@/lib/validation";

const PROVIDER_CATALOG: Record<
  (typeof INTEGRATION_PROVIDERS)[number],
  { name: string; description: string; category: string }
> = {
  WHATSAPP_CLOUD: {
    name: "WhatsApp Cloud API",
    description: "Official Meta Cloud API for marketing, utility & template broadcasts.",
    category: "Messaging",
  },
  META_MARKETING: {
    name: "Meta Ads Manager",
    description: "Sync Facebook & Instagram paid ad spend, impressions, and conversions.",
    category: "Paid Ads",
  },
  GOOGLE_ADS: {
    name: "Google Ads",
    description: "Connect Search, Display, and Performance Max campaign telemetry.",
    category: "Paid Ads",
  },
  SENDGRID_SMTP: {
    name: "SendGrid / SMTP",
    description: "High-deliverability transactional and marketing email delivery.",
    category: "Email",
  },
  TWILIO_SMS: {
    name: "Twilio Global SMS",
    description: "International E.164 SMS routing across 180+ countries.",
    category: "Messaging",
  },
  WEBHOOK: {
    name: "Custom Event Webhook",
    description: "Stream signed Cielora campaign and lead events to external endpoints.",
    category: "Developer",
  },
};

export async function GET(request: NextRequest) {
  return withProtectedRoute(request, async ({ user }) => {
    const saved = await prisma.integrationConnection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        displayName: true,
        status: true,
        configPreview: true,
        lastSyncedAt: true,
        updatedAt: true,
      },
    });

    const savedMap = new Map(saved.map((item) => [item.provider, item]));
    const integrations = INTEGRATION_PROVIDERS.map((provider) => {
      const meta = PROVIDER_CATALOG[provider];
      const conn = savedMap.get(provider);
      return {
        provider,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        status: conn?.status ?? "DISCONNECTED",
        displayName: conn?.displayName ?? meta.name,
        configPreview: conn?.configPreview ?? null,
        lastSyncedAt: conn?.lastSyncedAt ?? null,
      };
    });

    return apiOk({ integrations });
  });
}
