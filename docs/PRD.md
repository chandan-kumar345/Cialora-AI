# Product Requirements Document (PRD) — Cielora AI

**Document Version:** 1.0.0  
**Status:** Approved for Production Implementation  
**Repository / Workspace:** `Cialora-AI` (Product Brand: **Cielora AI** — *"Your Business. Beyond the Sky."*)  
**Target Market:** Global SaaS (Multi-Region, Multi-Currency, Multi-Locale)  

---

## 1. Executive Summary

**Cielora AI** is a globally ready, AI-powered, multi-channel marketing automation and customer growth SaaS platform. It unifies **Campaign Orchestration**, **Social Media Marketing**, **Paid Ads Management (Meta & Google)**, **Bulk Messaging (WhatsApp, SMS, Email)**, **Leads CRM**, **Customer Journey Automation**, and **Cross-Channel Analytics** inside a single, strictly tenant-isolated workspace.

Unlike static marketing dashboards or mock prototypes, Cielora AI is engineered as a **login-based, zero-dummy-data, API-driven production platform**:
- Every authenticated user operates inside a **strictly isolated workspace boundary** (`userId` ownership enforced server-side on every record, query, search, export, and metric).
- **Zero fabricated or dummy data** is seeded into user accounts; every metric, chart point, table row, notification, and report dynamically reflects real API-backed user activity.
- **Global-first localization** replaces hardcoded regional formats (such as static INR `₹` or single-timezone greetings) with dynamic `Intl`-based currency (`USD`, `EUR`, `GBP`, `INR`, `AED`, `SGD`, `AUD`, `CAD`, `JPY`), locale numbering, UTC-backed timezone conversion, and E.164 international contact handling.

---

## 2. Product Vision & Objectives

### 2.1 Vision Statement
Empower global businesses, agencies, and growth teams to launch, automate, measure, and optimize omnichannel marketing campaigns from a single cosmic-grade command center without compromising security or data isolation.

### 2.2 Core Business Objectives
1. **Unified Omnichannel Execution:** Eliminate tool sprawl across WhatsApp Business, SMS, Email, Social Media, and Paid Ads.
2. **Global Accessibility:** Support international teams with selectable currencies, locales, timezones, and international contact validation from onboarding onward.
3. **Strict Privacy & Tenant Isolation:** Guarantee zero cross-user data leakage through server-enforced session verification and row-level ownership guards.
4. **Actionable AI Assistance:** Provide an integrated **Cielora AI Assistant** that reads only the authenticated user's live workspace telemetry to recommend optimizations and draft campaigns.
5. **Real-Time API-First Telemetry:** Ensure every UI component renders live backend API state, with clear, actionable empty states for newly onboarded users.

---

## 3. Target User Personas

| Persona | Profile | Primary Needs | Key Modules Used |
| :--- | :--- | :--- | :--- |
| **Global Growth Marketer** | Runs omnichannel acquisition in SaaS, retail, or e-commerce across US/EU/APAC | Cross-channel attribution, ROI in local/reporting currency, campaign scheduling | Dashboard, Campaigns, Ads Manager, Reports |
| **SMB Founder / Operator** | Single-operator business owner managing WhatsApp, Email, and Instagram promotions | Fast campaign creation, clean lead pipeline, automated follow-ups | Dashboard, Bulk Messaging, Leads CRM, Automation |
| **Performance Media Buyer** | Manages paid Meta & Google Ads alongside landing-page lead capture | Budget tracking, CTR/ROAS visibility, lead conversion funnel | Ads Manager, Leads CRM, Reports |
| **Agency / CRM Coordinator** | Handles inbound inquiries, tags prospects, and exports clean pipeline reports | Strict data isolation, global phone/email validation, searchable CRM | Leads CRM, Global Search, Integrations |

---

## 4. Global Positioning & Localization Requirements ("Take It Globally")

Because Cielora AI targets global businesses rather than a single country, the following global requirements apply across all modules:

1. **Dynamic Currency Formatting:**
   - Supported default global currencies: `USD ($)`, `EUR (€)`, `GBP (£)`, `INR (₹)`, `AED (د.إ)`, `SGD (S$)`, `AUD (A$)`, `CAD (C$)`, `JPY (¥)`.
   - Stored as ISO 4217 currency code on the user's profile (`currency`, default `USD` or chosen during registration/settings).
   - Monetary values (Revenue, Ad Budget, Ad Spend, Deal Value) are formatted dynamically using `Intl.NumberFormat(user.locale, { style: 'currency', currency: user.currency })`.
2. **Dynamic Number & Date Formatting:**
   - All numeric KPIs (`Messages Sent`, `Delivered`, `Clicks`, `Leads`, `Impressions`) use the user's configured BCP-47 locale (`en-US`, `en-GB`, `en-IN`, `de-DE`, `fr-FR`, `ja-JP`, `ar-AE`, etc.) rather than hardcoded grouping.
   - All timestamps are persisted in **UTC** in the database and rendered in the user's configured IANA timezone (`user.timezone`, auto-detected on signup and editable in Settings).
3. **Dynamic Time-of-Day Greeting:**
   - Top header computes `Good Morning`, `Good Afternoon`, or `Good Evening` using the user's configured timezone rather than server local time.
4. **International Contact Standards:**
   - Phone numbers in Leads CRM and Bulk Messaging support **E.164 international format** (`+[country][number]`).
5. **Multi-Language Ready Architecture:**
   - UI copy and formatting helpers are centralized cleanly in an internationalization/formatting module to enable rapid addition of translated locale dictionaries.

---

## 5. User Isolation & Security Principles (Product Level)

1. **Login-Gated Application:**
   - Unauthenticated visitors land on the **Login / Sign Up** experience (`/login`).
   - Protected application routes (`/dashboard`, `/campaigns`, `/social`, `/ads`, `/messaging`, `/leads`, `/automation`, `/reports`, `/integrations`, `/settings`) redirect unauthenticated requests to `/login`.
   - All protected `/api/*` endpoints return `401 Unauthorized` when no valid session exists.
2. **Strict User-Wise Isolation:**
   - Every user account owns an isolated workspace and isolated records across every entity.
   - User A can **never** view, search, aggregate, modify, trigger, export, or delete User B's campaigns, metrics, leads, social posts, ad campaigns, bulk messages, automations, integrations, notifications, or audit logs.
   - Cross-user resource requests by ID always fail closed (`404 Not Found`) without confirming existence.
3. **Zero Dummy Data Policy:**
   - Freshly registered users start with an empty workspace (`0` campaigns, `0` leads, `0` messages sent, `0` revenue).
   - No fake metrics, placeholder customer rows, or pre-populated demo campaigns are injected into user databases.
   - Empty states guide the user to create real records via live API-backed flows.
4. **Credential Vault Safety:**
   - Third-party provider keys entered in **Integrations** (WhatsApp Cloud API, Meta Ads, Google Ads, SMTP/SendGrid, Twilio SMS, Webhooks) are encrypted at rest and never returned in plaintext to the browser.

---

## 6. Functional Requirements by Module

### 6.1 Authentication, Onboarding & Session Lifecycle (`/login`, `/register`, `/forgot-password`, `/reset-password`)
- **FR-AUTH-01 (Sign Up):** Users can register with Full Name, Workspace/Organization Name, Email, Strong Password (minimum 8 chars with uppercase, lowercase, digit, special character), Preferred Currency, Locale, and auto-detected Timezone.
- **FR-AUTH-02 (Login):** Email + Password login with "Remember me" toggle (short 24h session vs extended 30-day session) and show/hide password toggle.
- **FR-AUTH-03 (Google OAuth Integration):** "Continue with Google" button wired to OAuth flow when Google OAuth credentials are configured; displays an explicit configuration status message when OAuth environment credentials are absent (never bypasses real authentication).
- **FR-AUTH-04 (Password Recovery):** "Forgot password?" generates a single-use, expiring, hashed reset token with non-enumerating generic confirmation response; `/reset-password` validates token and updates password hash while revoking prior sessions.
- **FR-AUTH-05 (Session Management):** Users can inspect active sessions (IP/User-Agent/Last Active) and revoke individual sessions or sign out everywhere from Settings.

### 6.2 Global App Shell & Navigation
- **FR-SHELL-01 (Sidebar Navigation):** Dark cosmic sidebar grouped into:
  - **OVERVIEW:** `Dashboard`, `Campaigns`, `Social Marketing` (expandable sub-navigation: Studio, Calendar), `Ads Manager`, `Bulk Messaging`, `Leads CRM`, `Automation`, `Reports`.
  - **SETUP:** `Integrations`, `Settings`.
  - **Bottom Plan Card:** `Upgrade to Pro` card with crown visual and `Upgrade Now` action opening the Plan & Subscription management modal/view.
- **FR-SHELL-02 (Top Header):**
  - Timezone-accurate greeting (`Good [Morning/Afternoon/Evening], {FirstName} 👋`) + subtitle.
  - Global Search input (`Search campaigns, leads, reports...`) querying `/api/search` across the user's campaigns, leads, social posts, and ads.
  - Notification Bell with live unread count badge and interactive popover (`/api/notifications` mark read / mark all read).
  - User Profile Menu showing initials avatar, user full name, workspace name, active global currency/locale badge, Settings link, and Sign Out action.
- **FR-SHELL-03 (Responsive Design):** Collapsible mobile drawer navigation on `< 1024px` viewports and responsive multi-column grids down to 375px mobile width.

### 6.3 Executive Dashboard (`/dashboard`)
- **FR-DASH-01 (Hero Banner):** Cosmic dark gradient banner (`AI-Powered Marketing Suite`), value proposition, primary `Create Campaign` CTA (opens Campaign Creator modal/drawer), `Explore Features` CTA (opens interactive feature guide/module launcher), and cosmic laptop + channel motif.
- **FR-DASH-02 (Quick-Action Cards):** Six interactive cards (`Campaigns`, `Social Marketing`, `Ads Manager`, `Bulk Messaging`, `Leads CRM`, `Automation`) navigating directly to each module.
- **FR-DASH-03 (Marketing Performance Analytics):**
  - Range selector (`Last 7 Days`, `Last 30 Days`, `Last 90 Days`, `This Year`) backed by `GET /api/analytics/performance?range=...`.
  - 5 KPI summary cards (`Messages Sent`, `Delivered` + delivery rate %, `Clicks`, `Leads`, `Revenue`) with period-over-period growth delta computed strictly from user's database records.
  - Multi-series smooth area/spline chart (`Messages Sent`, `Delivered`, `Clicks`) with interactive tooltips, dynamic Y-axis scaling, and clean zero-state message when no telemetry exists yet.
- **FR-DASH-04 (Campaign Overview Donut Chart):**
  - Displays total campaign count in center and segmented counts for `Active`, `Scheduled`, `Completed`, and `Drafts` from `GET /api/analytics/overview`.
- **FR-DASH-05 (Cielora AI Assistant Card):**
  - Clicking `Ask Cielora AI` launches an interactive AI Assistant drawer backed by `POST /api/ai/assistant`, analyzing the user's real metrics, active campaigns, and lead pipeline to provide actionable recommendations or generate campaign copy/structures.
- **FR-DASH-06 (Recent Campaigns Table):**
  - Displays up to 5 most recent campaigns (`Campaign Name` + created date, `Channel`, `Type`, `Sent`, `Delivered` + %, `Clicks`, `Leads`, `Status`, `Actions` view/edit/status/delete) plus `View All ->` link to `/campaigns`.
  - Renders a structured empty state with a `Create Campaign` button when the user has 0 campaigns.

### 6.4 Campaigns Module (`/campaigns`)
- **FR-CAMP-01:** Full CRUD lifecycle (`Draft`, `Scheduled`, `Active`, `Paused`, `Completed`).
- **FR-CAMP-02:** Support channels (`WhatsApp`, `Meta Ads`, `Google Ads`, `Email`, `SMS`, `Instagram`, `Facebook`, `LinkedIn`) and campaign types (`Marketing`, `Utility`, `Promotional`, `Transactional`, `Awareness`).
- **FR-CAMP-03:** Record / ingest real performance telemetry events (`POST /api/campaigns/[id]/events`) for sent messages, deliveries, clicks, leads captured, and revenue attributed—updating both campaign totals and daily time-series rows atomically.
- **FR-CAMP-04:** Filter by status, channel, and keyword search; duplicate or archive campaigns.

### 6.5 Social Marketing (`/social`)
- **FR-SOC-01:** Create, schedule, publish, and manage social media posts across `Instagram`, `Facebook`, `LinkedIn`, `X`, and `YouTube`.
- **FR-SOC-02:** Track engagement metrics (`Likes`, `Comments`, `Shares`, `Reach`) per post via API and filter between Studio List and Calendar Schedule views.

### 6.6 Ads Manager (`/ads`)
- **FR-ADS-01:** Manage paid acquisition campaigns across `Meta Ads`, `Google Ads`, `LinkedIn Ads`, and `TikTok Ads`.
- **FR-ADS-02:** Track Budget, Spend (in user's global currency), Impressions, Clicks, Conversions, CTR, CPC, and ROAS computed dynamically on the server.

### 6.7 Bulk Messaging (`/messaging`)
- **FR-MSG-01:** Compose bulk broadcasts across `WhatsApp`, `SMS`, and `Email` with reusable message content, optional campaign linkage, and audience selection (all leads, by lead stage, or custom recipient count).
- **FR-MSG-02:** Executing/scheduling a broadcast logs a real `BulkMessage` record, creates notification alerts, and updates linked campaign telemetry when sent.

### 6.8 Leads CRM (`/leads`)
- **FR-LEAD-01:** Full Lead CRUD (`Full Name`, `Email`, `E.164 Phone`, `Company`, `Country`, `Source Channel`, `Pipeline Stage`: `New`, `Contacted`, `Qualified`, `Proposal`, `Won`, `Lost`, `Estimated Value`, `Notes`, `Tags`).
- **FR-LEAD-02:** Pipeline stage updates, filtering, search, and secure CSV export (with formula-injection protection) strictly scoped to the authenticated user.

### 6.9 Automation Journeys (`/automation`)
- **FR-AUTO-01:** Create, edit, pause/activate, execute-test, and delete automated customer workflows (`Trigger`: `Lead Created`, `Campaign Clicked`, `Message Delivered`, `Stage Changed`; `Channel Action`: `Send WhatsApp`, `Send Email`, `Send SMS`, `Notify Owner`; execution count and last-run timestamp).

### 6.10 Reports & Exports (`/reports`)
- **FR-REP-01:** Cross-channel summary breakdown (Campaigns, Messages, Delivery Rate, Clicks, CTR, Leads, Revenue, Ad Spend, ROAS) over selectable date ranges.
- **FR-REP-02:** Download sanitized CSV or JSON report exports of the user's own workspace analytics.

### 6.11 Integrations (`/integrations`) & Settings (`/settings`)
- **FR-INT-01:** Connect/configure channel providers (`WhatsApp Cloud API`, `Meta Marketing API`, `Google Ads API`, `SendGrid / SMTP Email`, `Twilio SMS`, `Custom Webhook`) with AES-256-GCM encrypted credentials and connection status tracking.
- **FR-SET-01:** Update profile name, workspace name, global currency, locale, timezone, language; change password; manage active sessions; view/upgrade workspace plan tier (`Starter`, `Pro`, `Enterprise`) and inspect security audit log.

---

## 7. Non-Functional Requirements

| Category | Requirement | Target |
| :--- | :--- | :--- |
| **Security** | Zero cross-tenant leakage; OWASP Top 10 coverage; encrypted secrets; HttpOnly sessions | 100% isolation verified via automated tests |
| **Performance** | Initial dashboard shell render & API p95 response latency | `< 200ms` p95 API latency (indexed user queries) |
| **Scalability** | Stateless API layer + indexed relational persistence ready for horizontal scaling | PostgreSQL-compatible schema + Docker deployment |
| **Accessibility** | Semantic landmarks, keyboard focus management, contrast compliance, ARIA labels | WCAG 2.1 AA |
| **Reliability** | Input validation on every boundary, atomic DB transactions for telemetry/auth, clean error envelopes | Zero unhandled 500s on invalid client input |
| **Data Integrity** | Zero hardcoded dummy datasets; UTC storage; strict server-derived timestamps and ownership | 100% API-driven UI |

---

## 8. Acceptance Criteria & Verification Gate

1. **Visual Alignment:** Login and Dashboard views match the uploaded reference designs in typography, cosmic purple sidebar/hero aesthetic, frosted auth layout, 6 module cards, 5 KPI cards, spline chart, donut chart, AI assistant card, and campaigns table.
2. **Global Readiness:** Changing currency (e.g., `USD` -> `EUR` -> `INR`) and locale in Settings updates every monetary figure, chart axis/tooltip, KPI number format, and greeting timezone across the entire app immediately.
3. **Strict User Isolation:** Automated integration tests verify that User B receives `404` / empty results when attempting to read, search, update, export, or delete any resource created by User A.
4. **Zero Dummy Data:** Creating a brand-new user yields `0` counts across all KPIs, charts, tables, and modules until the user performs real API-backed actions.
5. **Security Verification:** Rate limiting, password hashing, cookie attributes (`HttpOnly`, `SameSite=Lax`), CSRF origin checks, security headers, encrypted integration keys, and Zod input rejection are verified by automated tests.
