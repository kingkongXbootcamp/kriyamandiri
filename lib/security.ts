/**
 * Menghapus karakter kontrol ASCII berbahaya (kecuali newline standar bila diizinkan)
 */
export function stripControlChars(
  input: string,
  allowNewlines = false
): string {
  if (!input) return "";
  if (allowNewlines) {
    return input.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");
  }
  return input.replace(/[\x00-\x1F\x7F]/g, " ");
}

/**
 * Validasi ketat URL eksternal (hanya mengizinkan https://, menolak javascript:/data:/http:)
 */
export function sanitizeSafeHttpsUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Memastikan URL foto produk benar-benar berasal dari bucket Supabase Storage
 * dan berada di dalam folder milik userId yang sedang terautentikasi.
 */
export function sanitizeOwnedStorageImageUrl(
  rawUrl: string | null | undefined,
  userId: string
): { valid: boolean; sanitizedUrl: string | null } {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: true, sanitizedUrl: null };
  }

  const safeHttps = sanitizeSafeHttpsUrl(rawUrl);
  if (!safeHttps) {
    return { valid: false, sanitizedUrl: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { valid: false, sanitizedUrl: null };
  }

  try {
    const expectedOrigin = new URL(supabaseUrl).origin;
    const parsed = new URL(safeHttps);
    const expectedPrefix = `/storage/v1/object/public/product-images/${userId}/`;

    if (
      parsed.origin !== expectedOrigin ||
      !parsed.pathname.startsWith(expectedPrefix) ||
      parsed.pathname.includes("..")
    ) {
      return { valid: false, sanitizedUrl: null };
    }

    return { valid: true, sanitizedUrl: parsed.toString() };
  } catch {
    return { valid: false, sanitizedUrl: null };
  }
}

/**
 * Mencegah Open Redirect setelah login: hanya mengizinkan path internal /dashboard
 */
export function sanitizeDashboardRedirect(rawPath: string | null | undefined): string {
  const fallback = "/dashboard";
  if (!rawPath) return fallback;

  const trimmed = rawPath.trim();
  if (
    !trimmed.startsWith("/dashboard") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("@") ||
    trimmed.includes("://")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (
      parsed.origin !== "http://localhost" ||
      !parsed.pathname.startsWith("/dashboard")
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

/**
 * Sliding-window in-memory rate limiter ringan untuk proteksi endpoint dari spam
 */
const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (rateLimitStore.get(key) || []).filter(
    (ts) => ts > windowStart
  );

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] || now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    rateLimitStore.set(key, timestamps);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  rateLimitStore.set(key, timestamps);

  // Pembersihan memori berkala jika map membesar
  if (rateLimitStore.size > 5000) {
    for (const [k, list] of rateLimitStore.entries()) {
      if (list.length === 0 || list[list.length - 1] <= windowStart) {
        rateLimitStore.delete(k);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}