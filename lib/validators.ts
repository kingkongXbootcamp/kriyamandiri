import { sanitizeSafeHttpsUrl } from "@/lib/security";

export const RESERVED_SLUGS = new Set([
  "dashboard",
  "login",
  "register",
  "auth",
  "api",
  "admin",
  "settings",
  "profile",
  "products",
  "checkout",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSlug(slug: string): boolean {
  const clean = slug.toLowerCase().trim();
  if (RESERVED_SLUGS.has(clean)) {
    return false;
  }
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(clean) && clean.length >= 3 && clean.length <= 50;
}

export function sanitizeAndValidateWhatsApp(phone: string): {
  isValid: boolean;
  formatted: string;
} {
  let cleaned = String(phone || "").replace(/[^0-9]/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }

  const isValid = /^628[1-9][0-9]{7,11}$/.test(cleaned);

  return {
    isValid,
    formatted: cleaned,
  };
}

export function validateStoreLogoUrl(rawUrl: string | null | undefined): {
  valid: boolean;
  sanitizedUrl: string | null;
} {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: true, sanitizedUrl: null };
  }
  const safe = sanitizeSafeHttpsUrl(rawUrl);
  if (!safe) {
    return { valid: false, sanitizedUrl: null };
  }
  return { valid: true, sanitizedUrl: safe };
}