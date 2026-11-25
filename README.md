# Cialora AI (`Cialora-AI`)

**Your Business. Beyond the Sky.** — Global, Login-Gated, Strictly User-Isolated Omnichannel AI Marketing Platform.

## Architecture & Product Documentation

- [Product Requirements Document (PRD)](./docs/PRD.md)
- [Technical Requirements Document (TRD)](./docs/TRD.md)
- [System & UI Design Architecture](./docs/DESIGN_ARCHITECTURE.md)

## Key Production Guarantees

- **Strict User-Wise Isolation:** Every domain entity (`Campaign`, `CampaignMetricDaily`, `SocialPost`, `AdCampaign`, `BulkMessage`, `Lead`, `AutomationWorkflow`, `IntegrationConnection`, `Notification`, `AuditLog`, `Session`) is scoped by authenticated `userId` derived strictly from the server-side `HttpOnly` session cookie.
- **Zero Dummy Data:** Freshly registered users start with clean zeroed metrics and empty lists. Every dashboard KPI, time-series chart, donut chart, table row, notification, search result, and report is driven dynamically by REST APIs.
- **Global Readiness:** Supports configurable ISO 4217 currencies (`USD`, `EUR`, `GBP`, `INR`, `AED`, `SGD`, `AUD`, `CAD`, `JPY`, `CHF`, `BRL`), BCP-47 locales, UTC-backed timezone formatting, and E.164 international phone numbers.
- **Hardened Security:** `crypto.scrypt` password hashing with `timingSafeEqual`, SHA-256 opaque revocable sessions, AES-256-GCM integration secret vault, CSRF origin checks, sliding-window rate limiting, CSP & security headers, Zod validation, and CSV formula-injection neutralization.

## Local Development Setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Verification Commands

```bash
npm run typecheck
npm test
npm run build
```

## Production Deployment (Docker + PostgreSQL)

1. Configure `ENCRYPTION_SECRET`, `POSTGRES_PASSWORD`, and `APP_ORIGIN` in `.env`.
2. Run `docker compose up --build -d`.
