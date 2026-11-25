export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  defaultLocale: string;
}

export const GLOBAL_CURRENCIES: CurrencyMeta[] = [
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2, defaultLocale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2, defaultLocale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", decimals: 2, defaultLocale: "en-GB" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2, defaultLocale: "en-IN" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", decimals: 2, defaultLocale: "en-AE" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimals: 2, defaultLocale: "en-SG" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2, defaultLocale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2, defaultLocale: "en-CA" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0, defaultLocale: "ja-JP" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", decimals: 2, defaultLocale: "de-CH" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", decimals: 2, defaultLocale: "pt-BR" },
];

export const GLOBAL_LOCALES = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-IN", label: "English (India)" },
  { code: "en-SG", label: "English (Singapore)" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-CA", label: "English (Canada)" },
  { code: "de-DE", label: "Deutsch (Deutschland)" },
  { code: "fr-FR", label: "Français (France)" },
  { code: "es-ES", label: "Español (España)" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "ja-JP", label: "日本語 (日本)" },
  { code: "ar-AE", label: "العربية (الإمارات)" },
];

export const GLOBAL_COUNTRIES = [
  { code: "US", name: "United States", currency: "USD", locale: "en-US" },
  { code: "GB", name: "United Kingdom", currency: "GBP", locale: "en-GB" },
  { code: "IN", name: "India", currency: "INR", locale: "en-IN" },
  { code: "DE", name: "Germany", currency: "EUR", locale: "de-DE" },
  { code: "FR", name: "France", currency: "EUR", locale: "fr-FR" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", locale: "en-AE" },
  { code: "SG", name: "Singapore", currency: "SGD", locale: "en-SG" },
  { code: "AU", name: "Australia", currency: "AUD", locale: "en-AU" },
  { code: "CA", name: "Canada", currency: "CAD", locale: "en-CA" },
  { code: "JP", name: "Japan", currency: "JPY", locale: "ja-JP" },
  { code: "BR", name: "Brazil", currency: "BRL", locale: "pt-BR" },
  { code: "CH", name: "Switzerland", currency: "CHF", locale: "de-CH" },
];

export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function getCurrencyMeta(currencyCode: string): CurrencyMeta {
  const upper = currencyCode.toUpperCase();
  return (
    GLOBAL_CURRENCIES.find((c) => c.code === upper) ?? GLOBAL_CURRENCIES[0]
  );
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isValidLocale(locale: string): boolean {
  try {
    Intl.NumberFormat(locale);
    return true;
  } catch {
    return false;
  }
}

export function toMinorUnits(majorAmount: number, currency = "USD"): number {
  const meta = getCurrencyMeta(currency);
  const factor = Math.pow(10, meta.decimals);
  return Math.round(majorAmount * factor);
}

export function fromMinorUnits(minorUnits: number, currency = "USD"): number {
  const meta = getCurrencyMeta(currency);
  const factor = Math.pow(10, meta.decimals);
  return minorUnits / factor;
}

export function formatCurrency(
  minorUnits: number,
  currency = "USD",
  locale = "en-US"
): string {
  const meta = getCurrencyMeta(currency);
  const safeLocale = isValidLocale(locale) ? locale : meta.defaultLocale;
  const amount = fromMinorUnits(minorUnits, meta.code);
  return new Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency: meta.code,
    maximumFractionDigits: meta.decimals,
    minimumFractionDigits: amount % 1 === 0 ? 0 : meta.decimals,
  }).format(amount);
}

export function formatNumber(value: number, locale = "en-US"): string {
  const safeLocale = isValidLocale(locale) ? locale : "en-US";
  return new Intl.NumberFormat(safeLocale).format(value);
}

export function formatCompactNumber(value: number, locale = "en-US"): string {
  const safeLocale = isValidLocale(locale) ? locale : "en-US";
  return new Intl.NumberFormat(safeLocale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(
  dateInput: Date | string,
  timezone = "UTC",
  locale = "en-US"
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "—";
  const safeLocale = isValidLocale(locale) ? locale : "en-US";
  const safeTz = isValidTimezone(timezone) ? timezone : "UTC";
  return new Intl.DateTimeFormat(safeLocale, {
    timeZone: safeTz,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatShortChartDate(
  dateInput: Date | string,
  timezone = "UTC",
  locale = "en-US"
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "";
  const safeLocale = isValidLocale(locale) ? locale : "en-US";
  const safeTz = isValidTimezone(timezone) ? timezone : "UTC";
  return new Intl.DateTimeFormat(safeLocale, {
    timeZone: safeTz,
    day: "numeric",
    month: "short",
  }).format(date);
}

export function getTimeOfDayGreeting(timezone = "UTC", now = new Date()): string {
  const safeTz = isValidTimezone(timezone) ? timezone : "UTC";
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = Number(hourStr) % 24;
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function getFirstName(fullName: string): string {
  const cleaned = fullName.trim();
  if (!cleaned) return "there";
  return cleaned.split(/\s+/)[0];
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
