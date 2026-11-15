import { createClient } from "@supabase/supabase-js";

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  logo_url: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
}

const RESERVED_SLUGS = new Set([
  "dashboard",
  "login",
  "register",
  "auth",
  "api",
  "admin",
  "settings",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[PUBLIC_CATALOG_ERROR] Env variable Supabase kosong di server:", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getPublicStoreBySlug(slug: string): Promise<PublicStore | null> {
  const cleanSlug = decodeURIComponent(slug || "").toLowerCase().trim();
  if (!cleanSlug || RESERVED_SLUGS.has(cleanSlug)) {
    return null;
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, city, logo_url")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (error) {
    console.error("[PUBLIC_CATALOG_ERROR] Gagal query tabel stores:", {
      slug: cleanSlug,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  if (!data) {
    console.warn("[PUBLIC_CATALOG_WARN] Data toko tidak ditemukan (0 baris):", {
      slug: cleanSlug,
      supabaseUrlHost: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host,
    });
    return null;
  }

  return data;
}

export async function getPublicProductsByStoreId(
  storeId: string
): Promise<PublicProduct[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, description, image_url, is_available")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("is_available", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[PUBLIC_CATALOG_ERROR] Gagal query tabel products:", {
      storeId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    price: Number(item.price),
  }));
}