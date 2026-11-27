import { z } from "zod";
import {
  GLOBAL_CURRENCIES,
  isValidLocale,
  isValidTimezone,
} from "@/lib/format";
import { isSafeHttpUrl } from "@/lib/security";

const allowedCurrencyCodes = new Set(GLOBAL_CURRENCIES.map((c) => c.code));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.")
  .max(254, "Email is too long.");

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => allowedCurrencyCodes.has(val), {
    message: "Unsupported currency code.",
  });

export const localeSchema = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .refine(isValidLocale, { message: "Invalid BCP-47 locale." });

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isValidTimezone, { message: "Invalid IANA timezone." });

export const optionalSafeUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((val) => val === "" || isSafeHttpUrl(val), {
    message: "URL must start with http:// or https://",
  })
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const optionalPhoneE164Schema = z
  .string()
  .trim()
  .max(20)
  .refine((val) => val === "" || /^\+[1-9]\d{6,14}$/.test(val), {
    message: "Phone must use global E.164 format (e.g. +14155552671).",
  })
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(100),
  workspaceName: z
    .string()
    .trim()
    .min(2, "Workspace name is required.")
    .max(100),
  email: emailSchema,
  password: strongPasswordSchema,
  country: z.string().trim().min(2).max(4).default("US"),
  currency: currencySchema.default("USD"),
  locale: localeSchema.default("en-US"),
  timezone: timezoneSchema.default("UTC"),
  rememberMe: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16, "Invalid reset token.").max(256),
  password: strongPasswordSchema,
});

export const CAMPAIGN_CHANNELS = [
  "WHATSAPP",
  "META_ADS",
  "GOOGLE_ADS",
  "EMAIL",
  "SMS",
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
] as const;

export const CAMPAIGN_TYPES = [
  "MARKETING",
  "UTILITY",
  "PROMOTIONAL",
  "TRANSACTIONAL",
  "AWARENESS",
] as const;

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
] as const;

export const CAMPAIGN_MEDIA_TYPES = ["NONE", "IMAGE"] as const;

export const CAMPAIGN_ACTION_TYPES = [
  "VISIT_WEBSITE",
  "CALL_PHONE",
  "QUICK_REPLY",
] as const;

export const campaignMediaUrlSchema = z
  .string()
  .trim()
  .max(1_500_000, "Uploaded image exceeds maximum size.")
  .refine(
    (val) =>
      val === "" ||
      /^\/images\/[A-Za-z0-9._-]+$/.test(val) ||
      isSafeHttpUrl(val) ||
      /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(val),
    {
      message:
        "Media must be an uploaded raster image (PNG, JPEG, WebP, GIF) or http(s) URL.",
    }
  )
  .optional()
  .nullable()
  .transform((v) => (!v ? undefined : v));

export const campaignActionSchema = z.object({
  type: z.enum(CAMPAIGN_ACTION_TYPES),
  label: z.string().trim().min(1, "Action button text is required.").max(40),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) =>
        val === "" ||
        isSafeHttpUrl(val) ||
        /^\+?[0-9\s()-]{5,20}$/.test(val),
      {
        message: "Action target must use https:// or a valid phone number.",
      }
    )
    .optional()
    .transform((v) => (!v ? undefined : v)),
});

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(2, "Campaign name is required.").max(140),
  description: z.string().trim().max(2000).optional(),
  channel: z.enum(CAMPAIGN_CHANNELS),
  type: z.enum(CAMPAIGN_TYPES),
  status: z.enum(CAMPAIGN_STATUSES).optional().default("DRAFT"),
  mediaType: z.enum(CAMPAIGN_MEDIA_TYPES).optional().default("NONE"),
  mediaUrl: campaignMediaUrlSchema,
  footerText: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (!v ? undefined : v)),
  actions: z.array(campaignActionSchema).max(3).optional(),
  budgetCents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export const campaignEventSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
    .optional(),
  sentCount: z.number().int().min(0).max(10_000_000).optional().default(0),
  deliveredCount: z.number().int().min(0).max(10_000_000).optional().default(0),
  clickCount: z.number().int().min(0).max(10_000_000).optional().default(0),
  leadCount: z.number().int().min(0).max(1_000_000).optional().default(0),
  revenueCents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
  spendCents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
  impressionsCount: z.number().int().min(0).max(100_000_000).optional().default(0),
});

export const socialPostCreateSchema = z.object({
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X", "YOUTUBE"]),
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(2).max(5000),
  mediaUrl: optionalSafeUrlSchema,
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).optional().default("DRAFT"),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const socialPostUpdateSchema = socialPostCreateSchema.partial().extend({
  likesCount: z.number().int().min(0).max(100_000_000).optional(),
  commentsCount: z.number().int().min(0).max(100_000_000).optional(),
  sharesCount: z.number().int().min(0).max(100_000_000).optional(),
  reachCount: z.number().int().min(0).max(100_000_000).optional(),
});

export const adCampaignCreateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  platform: z.enum(["META_ADS", "GOOGLE_ADS", "LINKEDIN_ADS", "TIKTOK_ADS"]),
  objective: z.enum([
    "CONVERSIONS",
    "TRAFFIC",
    "LEAD_GENERATION",
    "BRAND_AWARENESS",
  ]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional().default("DRAFT"),
  dailyBudgetCents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
  spendCents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
  impressionsCount: z.number().int().min(0).max(1_000_000_000).optional().default(0),
  clicksCount: z.number().int().min(0).max(100_000_000).optional().default(0),
  conversionsCount: z.number().int().min(0).max(10_000_000).optional().default(0),
  revenueCents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
});

export const adCampaignUpdateSchema = adCampaignCreateSchema.partial();

export const bulkMessageCreateSchema = z.object({
  title: z.string().trim().min(2).max(140),
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(2).max(5000),
  campaignId: z.string().trim().min(1).max(64).optional().nullable(),
  audienceFilter: z
    .enum(["ALL_LEADS", "NEW_LEADS", "QUALIFIED_LEADS", "CUSTOM_LIST"])
    .optional()
    .default("ALL_LEADS"),
  recipientCount: z.number().int().min(0).max(1_000_000).optional().default(0),
  sendImmediately: z.boolean().optional().default(false),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
] as const;

export const leadCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Lead name is required.").max(120),
  email: emailSchema.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  phone: optionalPhoneE164Schema,
  company: z.string().trim().max(120).optional(),
  country: z.string().trim().max(64).optional(),
  sourceChannel: z.string().trim().min(1).max(40).optional().default("DIRECT"),
  stage: z.enum(LEAD_STAGES).optional().default("NEW"),
  estimatedValueCents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
  tags: z.string().trim().max(240).optional().default(""),
  notes: z.string().trim().max(2000).optional(),
  campaignId: z.string().trim().max(64).optional().nullable(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const automationCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  triggerType: z.enum([
    "LEAD_CREATED",
    "CAMPAIGN_CLICKED",
    "MESSAGE_DELIVERED",
    "STAGE_CHANGED",
    "SCHEDULE_POST",
    "NEW_CONTENT_ADDED",
    "RECURRING_SCHEDULE",
  ]),
  actionChannel: z.enum([
    "WHATSAPP",
    "EMAIL",
    "SMS",
    "INTERNAL_ALERT",
    "INSTAGRAM",
    "FACEBOOK",
    "INSTAGRAM_AND_FACEBOOK",
  ]),
  actionTemplate: z.string().trim().min(2).max(2000),
  isActive: z.boolean().optional().default(true),
});

export const automationUpdateSchema = automationCreateSchema.partial();

export const INTEGRATION_PROVIDERS = [
  "INSTAGRAM",
  "FACEBOOK",
  "WHATSAPP_CLOUD",
  "META_MARKETING",
  "GOOGLE_ADS",
  "SENDGRID_SMTP",
  "TWILIO_SMS",
  "WEBHOOK",
] as const;

export const integrationUpsertSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  apiKey: z.string().trim().min(6, "Credential token must be at least 6 characters.").max(1000),
  accountId: z.string().trim().max(200).optional(),
  webhookUrl: optionalSafeUrlSchema,
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  workspaceName: z.string().trim().min(2).max(100).optional(),
  country: z.string().trim().min(2).max(4).optional(),
  currency: currencySchema.optional(),
  locale: localeSchema.optional(),
  timezone: timezoneSchema.optional(),
  language: z.string().trim().min(2).max(10).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: strongPasswordSchema,
});

export const planUpdateSchema = z.object({
  planTier: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
});

export const aiAssistantSchema = z.object({
  prompt: z.string().trim().min(2, "Please ask a question or request a campaign idea.").max(1500),
});
