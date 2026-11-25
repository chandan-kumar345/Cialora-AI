# Technical Requirements Document (TRD) — Cielora AI

**Document Version:** 1.0.0  
**Target Platform:** Web SaaS (Next.js App Router + TypeScript + Prisma ORM)  
**Database Engine:** SQLite (Local Development) / PostgreSQL 16 (Production Deployment Parity)  
**Runtime Target:** Node.js 24 LTS  

---

## 1. Technology Stack & Architecture Decisions

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend & BFF Framework** | **Next.js 16 (App Router) + React 19 + TypeScript (Strict)** | Unified SSR/RSC security boundary, zero-bundle server auth checks, built-in API route handlers, seamless security headers via `next.config.ts` and `middleware.ts`. |
| **Styling & Design System** | **Tailwind CSS v4 + Custom Cosmic Design Tokens + Lucide Icons** | CSS-first `@theme` tokens matching brand palette (`#140B29`, `#7C3AED`, `#EC4899`, `#F97316`), zero runtime CSS-in-JS overhead, responsive grids. |
| **Data Visualization** | **Custom Accessible Interactive SVG Spline & Donut Charts** | Pixel-accurate spline curves, gradients, dynamic scaling, interactive tooltips, zero third-party hydration mismatches on React 19. |
| **ORM & Database** | **Prisma ORM v6 (`prisma` + `@prisma/client`)** | Type-safe parameterized queries (SQLi prevention), schema-enforced foreign keys & composite indexes, SQLite dev zero-config + PostgreSQL production parity (`schema.postgres.prisma`). |
| **Validation** | **Zod v4** | Runtime schema validation on every API request body, query string, and environment boundary. |
| **Authentication** | **Opaque 256-bit Tokens + SHA-256 Session Store + `crypto.scrypt`** | Revocable server-side sessions in `HttpOnly`, `SameSite=Lax` cookies; NIST-compliant per-user salted `scrypt` password hashes with `timingSafeEqual`. |
| **Credential Encryption** | **Node `crypto` AES-256-GCM** | Encrypts third-party integration keys/tokens at rest with per-record 96-bit IV and authentication tag. |
| **Testing** | **Vitest / Node Test Runner (`tsx --test`)** | Automated unit tests (crypto, formatting, validation, rate limiting) and cross-user isolation integration tests against real DB/API handlers. |

---

## 2. Multi-Tenant / User-Wise Data Isolation Specification

### 2.1 Core Isolation Invariant
**Every domain record belongs strictly to a single authenticated user (`userId`)**. Client-supplied identifiers (`userId`, `ownerId`, `workspaceId`, `accountId`) are **never** accepted from request parameters, headers, or JSON bodies to determine ownership.

### 2.2 Server-Side Authentication Guard (`requireAuthUser`)
Every protected route handler and server layout follows this sequence:
1. Extract raw session token from `cielora_session` (`HttpOnly`) cookie.
2. Compute `tokenHash = SHA-256(rawToken)`.
3. Query `Session` joined with `User` where `tokenHash = tokenHash` AND `expiresAt > NOW()` AND `revokedAt IS NULL`.
4. Reject with `401 Unauthorized` (API) or redirect to `/login` (UI routes) if invalid or expired.
5. Update `lastActiveAt` throttled asynchronously; inject trusted `authUser` (`id`, `email`, `name`, `workspaceName`, `currency`, `locale`, `timezone`, `planTier`) into the handler context.

### 2.3 Ownership Enforcement Matrix
Every database access inside API handlers MUST satisfy one of:
- **Scoped Read List:** `where: { userId: authUser.id, ...filters }`
- **Scoped Single Read:** `findFirst({ where: { id, userId: authUser.id } })` -> if null, return `404 Not Found` (never `403`, preventing resource ID enumeration).
- **Scoped Update:** `updateMany({ where: { id, userId: authUser.id }, data })` or transaction checking `userId === authUser.id` -> return `404` if `count === 0`.
- **Scoped Delete:** `deleteMany({ where: { id, userId: authUser.id } })` -> return `404` if `count === 0`.
- **Scoped Foreign Key Validation:** When linking entities (e.g. creating a `BulkMessage` linked to `campaignId`, or logging a `CampaignMetricDaily` event for `campaignId`), verify the parent `campaign` also satisfies `userId === authUser.id` before committing!

---

## 3. Database Schema & Indexing Specification

All timestamps are stored in **UTC** (`DateTime @default(now())`).

### Core Models
1. **`User`**: `id (cuid)`, `email (unique, lowercased)`, `passwordHash`, `fullName`, `workspaceName`, `country`, `currency (ISO 4217, default "USD")`, `locale (BCP-47, default "en-US")`, `timezone (IANA, default "UTC")`, `language (default "en")`, `planTier ("STARTER" | "PRO" | "ENTERPRISE")`, `googleId (nullable unique)`, `createdAt`, `updatedAt`.
2. **`Session`**: `id`, `userId (FK -> User Cascade)`, `tokenHash (unique)`, `rememberMe`, `userAgent`, `ipAddress`, `expiresAt`, `revokedAt`, `lastActiveAt`, `createdAt`. Index: `[userId, expiresAt]`.
3. **`PasswordResetToken`**: `id`, `userId (FK -> User Cascade)`, `tokenHash (unique)`, `expiresAt`, `usedAt`, `createdAt`.
4. **`Campaign`**: `id`, `userId (FK)`, `name`, `description`, `channel` (`WHATSAPP | META_ADS | GOOGLE_ADS | EMAIL | SMS | INSTAGRAM | FACEBOOK | LINKEDIN`), `type` (`MARKETING | UTILITY | PROMOTIONAL | TRANSACTIONAL | AWARENESS`), `status` (`DRAFT | SCHEDULED | ACTIVE | PAUSED | COMPLETED`), `budgetCents`, `sentCount`, `deliveredCount`, `clickCount`, `leadCount`, `revenueCents`, `scheduledAt`, `startedAt`, `completedAt`, `createdAt`, `updatedAt`. Composite index: `[userId, createdAt]`, `[userId, status]`.
5. **`CampaignMetricDaily`**: `id`, `userId (FK)`, `campaignId (FK -> Campaign Cascade)`, `date` (UTC midnight date), `sentCount`, `deliveredCount`, `clickCount`, `leadCount`, `revenueCents`, `spendCents`, `impressionsCount`, `createdAt`, `updatedAt`. Unique constraint: `[campaignId, date]`; composite index: `[userId, date]`.
6. **`SocialPost`**: `id`, `userId (FK)`, `platform` (`INSTAGRAM | FACEBOOK | LINKEDIN | X | YOUTUBE`), `content`, `mediaUrl`, `status` (`DRAFT | SCHEDULED | PUBLISHED`), `scheduledAt`, `publishedAt`, `likesCount`, `commentsCount`, `sharesCount`, `reachCount`, `createdAt`, `updatedAt`. Index: `[userId, createdAt]`.
7. **`AdCampaign`**: `id`, `userId (FK)`, `name`, `platform` (`META_ADS | GOOGLE_ADS | LINKEDIN_ADS | TIKTOK_ADS`), `objective`, `status` (`DRAFT | ACTIVE | PAUSED | COMPLETED`), `dailyBudgetCents`, `spendCents`, `impressionsCount`, `clicksCount`, `conversionsCount`, `revenueCents`, `startDate`, `endDate`, `createdAt`, `updatedAt`. Index: `[userId, status]`.
8. **`BulkMessage`**: `id`, `userId (FK)`, `campaignId (nullable FK)`, `title`, `channel` (`WHATSAPP | SMS | EMAIL`), `subject`, `body`, `audienceFilter`, `recipientCount`, `deliveredCount`, `failedCount`, `status` (`DRAFT | SCHEDULED | SENT`), `scheduledAt`, `sentAt`, `createdAt`, `updatedAt`. Index: `[userId, createdAt]`.
9. **`Lead`**: `id`, `userId (FK)`, `campaignId (nullable FK)`, `fullName`, `email`, `phone (E.164)`, `company`, `country`, `sourceChannel`, `stage` (`NEW | CONTACTED | QUALIFIED | PROPOSAL | WON | LOST`), `estimatedValueCents`, `tags`, `notes`, `createdAt`, `updatedAt`. Indexes: `[userId, stage]`, `[userId, createdAt]`.
10. **`AutomationWorkflow`**: `id`, `userId (FK)`, `name`, `description`, `triggerType` (`LEAD_CREATED | CAMPAIGN_CLICKED | MESSAGE_DELIVERED | STAGE_CHANGED`), `actionChannel` (`WHATSAPP | EMAIL | SMS | INTERNAL_ALERT`), `actionTemplate`, `isActive (Boolean)`, `executionCount`, `lastExecutedAt`, `createdAt`, `updatedAt`. Index: `[userId, isActive]`.
11. **`IntegrationConnection`**: `id`, `userId (FK)`, `provider` (`WHATSAPP_CLOUD | META_MARKETING | GOOGLE_ADS | SENDGRID_SMTP | TWILIO_SMS | WEBHOOK`), `displayName`, `status` (`CONNECTED | DISCONNECTED | ERROR`), `encryptedConfig`, `configPreview`, `lastSyncedAt`, `createdAt`, `updatedAt`. Unique constraint: `[userId, provider]`.
12. **`Notification`**: `id`, `userId (FK)`, `title`, `message`, `category` (`CAMPAIGN | LEAD | SYSTEM | SECURITY | AUTOMATION`), `isRead`, `actionUrl`, `createdAt`. Index: `[userId, isRead, createdAt]`.
13. **`AuditLog`**: `id`, `userId (nullable FK -> SetNull)`, `actorEmail`, `action`, `entityType`, `entityId`, `ipAddress`, `userAgent`, `metadataJson`, `createdAt`. Index: `[userId, createdAt]`.

*Note on monetary precision:* Monetary amounts are stored in **minor currency units (`Int` / `BigInt` cents or smallest unit)** or scaled decimal-safe integer units converted accurately per currency's minor digit count (`USD/EUR/INR = 2`, `JPY = 0`) using `Intl.NumberFormat` rules to eliminate floating-point rounding drift!

---

## 4. API Contract & Endpoints

All endpoints live under `/api/...`, return `application/json` (except `/api/reports/export` CSV download), validate payloads via Zod, enforce CSRF origin checks on mutations, and require `authUser` except `/api/health` and `/api/auth/*`.

### 4.1 Auth & Account APIs
| Method | Path | Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create user + isolated workspace + initial session cookie | No (Rate-limited) |
| `POST` | `/api/auth/login` | Authenticate user + issue `HttpOnly` session cookie | No (Rate-limited) |
| `POST` | `/api/auth/logout` | Revoke active session in DB + clear cookie | Yes |
| `POST` | `/api/auth/forgot-password` | Issue non-enumerating expiring reset token | No (Rate-limited) |
| `POST` | `/api/auth/reset-password` | Verify token, rotate password hash, revoke sessions | No (Rate-limited) |
| `GET` | `/api/auth/me` | Return authenticated user profile & workspace preferences | Yes |
| `GET` | `/api/auth/providers` | Report available OAuth provider configuration status | No |
| `GET` | `/api/auth/google` | Redirect to Google OAuth consent if configured | No |
| `GET` | `/api/auth/google/callback` | Handle Google OAuth callback securely with state verification | No |

### 4.2 Analytics, Dashboard, Search & AI APIs
| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/performance?range=7d\|30d\|90d\|1y` | Dynamic KPIs (`sent`, `delivered`, `deliveryRate`, `clicks`, `leads`, `revenue`), period growth %, and daily spline time series strictly for `authUser.id`. |
| `GET` | `/api/analytics/overview` | Campaign status breakdown (`total`, `active`, `scheduled`, `completed`, `drafts`) for `authUser.id`. |
| `GET` | `/api/search?q=...` | Cross-module live search across user's Campaigns, Leads, Social Posts, and Ad Campaigns. |
| `POST` | `/api/ai/assistant` | Analyzes user's real DB stats & campaigns to provide strategic insights or draft copy (uses `GEMINI_API_KEY` if configured, else deterministic real-telemetry analyzer — zero fake metrics). |

### 4.3 Domain Resource APIs (All Strictly Scoped to `authUser.id`)
- **Campaigns:**
  - `GET /api/campaigns` (filters: `status`, `channel`, `search`, `limit`)
  - `POST /api/campaigns` (create campaign)
  - `GET /api/campaigns/[id]` (single campaign + daily telemetry)
  - `PATCH /api/campaigns/[id]` (update status/fields)
  - `DELETE /api/campaigns/[id]` (delete campaign)
  - `POST /api/campaigns/[id]/events` (record real delivery/click/lead/revenue telemetry atomically into `Campaign` + `CampaignMetricDaily`)
- **Social Marketing:** `GET/POST /api/social`, `PATCH/DELETE /api/social/[id]`
- **Ads Manager:** `GET/POST /api/ads`, `PATCH/DELETE /api/ads/[id]`
- **Bulk Messaging:** `GET/POST /api/messaging`, `POST /api/messaging/[id]/send`, `DELETE /api/messaging/[id]`
- **Leads CRM:** `GET/POST /api/leads`, `PATCH/DELETE /api/leads/[id]`, `GET /api/leads/export` (safe CSV)
- **Automation Journeys:** `GET/POST /api/automation`, `PATCH/DELETE /api/automation/[id]`, `POST /api/automation/[id]/trigger`
- **Reports:** `GET /api/reports?range=...`, `GET /api/reports/export?format=csv|json&range=...`
- **Integrations:** `GET /api/integrations`, `PUT /api/integrations/[provider]`, `DELETE /api/integrations/[provider]`
- **Notifications:** `GET /api/notifications`, `PATCH /api/notifications` (mark read / mark all read)
- **Settings & Sessions:** `PATCH /api/settings/profile`, `POST /api/settings/password`, `GET /api/settings/sessions`, `DELETE /api/settings/sessions/[id]`, `GET /api/settings/audit-logs`, `POST /api/settings/plan`
- **Health:** `GET /api/health` (DB connectivity probe without exposing secrets)

---

## 5. Security Engineering Specification

1. **Password Hashing:** `crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 })` with 16-byte `crypto.randomBytes(16)` salt and constant-time `crypto.timingSafeEqual`.
2. **Session Hygiene:**
   - 32-byte `crypto.randomBytes` opaque token -> stored as SHA-256 hex digest in `Session.tokenHash`.
   - Cookie flags: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: process.env.NODE_ENV === 'production' && isHttps`.
   - TTL: 24 hours default; 30 days if `rememberMe === true`.
3. **CSRF Mitigation:** All non-GET requests to `/api/*` validate `Origin` (or fallback `Referer`) against `Host` / `ALLOWED_ORIGIN` when present, paired with `SameSite=Lax` cookies and strict `application/json` content-type validation on JSON endpoints.
4. **Rate Limiting:** Sliding-window in-memory limiter (extensible via Redis interface in multi-instance production):
   - Auth login/register/forgot-password: `10 requests / 15 minutes` per IP+route key.
   - AI & mutation endpoints: `60 requests / minute` per user/IP.
5. **Security Headers (`next.config.ts` & `middleware.ts`):**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Content-Security-Policy`: restricts `default-src 'self'`, blocks `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.
   - `Strict-Transport-Security` when served over HTTPS in production.
6. **Secret Protection (AES-256-GCM):** Integration API keys/tokens encrypted before DB insert using `ENCRYPTION_SECRET` (32-byte key derived via HKDF/SHA-256; warning & fail-closed behavior in production if `ENCRYPTION_SECRET` is unset). Masked preview only (`••••abcd`) sent to UI.
7. **CSV Formula Injection Prevention:** Any CSV cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is prefixed with `'` before RFC-4180 quoting.
8. **XSS & Open Redirect Prevention:** Zero `dangerouslySetInnerHTML`, URL validation strictly enforces `https:`/`http:` protocols, and post-login redirects validate relative paths (`/^\/[^/]/`).

---

## 6. Testing & Verification Requirements

| Test Suite | Coverage Scope | Pass Criteria |
| :--- | :--- | :--- |
| **Crypto & Security Unit Tests** | `scrypt` hashing/verification, AES-256-GCM encryption/decryption, CSV injection neutralization, safe URL checks, rate limiter | 100% pass |
| **Global Formatting Tests** | Currency minor units (`USD`, `EUR`, `INR`, `JPY`), locale numbering, timezone greetings | 100% pass |
| **Cross-User Isolation Integration Tests** | Register User A & User B; verify User B receives `404`/empty data across Campaigns, Leads, Social, Ads, Messaging, Automation, Integrations, Notifications, Search, Analytics, Reports | Zero cross-tenant leaks |
| **Auth & Validation Tests** | Weak password rejection, unauthenticated `401` enforcement, invalid Zod payloads `400`, rate-limit `429` | 100% pass |
| **Production Build & Runtime E2E** | `npx next typegen`, `npm run build`, live server boot + API & UI verification | Clean build & live pass |
