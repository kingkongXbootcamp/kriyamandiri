import { createClient } from "@/lib/supabase/server";

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

// Daftar rute internal aplikasi agar tidak bertabrakan dengan slug toko
const RESERVED_SLUGS = new Set([
  "dashboard",
  "login",
  "register",
  "auth",
  "api",
  "admin",
  "settings",
]);

export async function getPublicStoreBySlug(slug: string): Promise<PublicStore | null> {
  const cleanSlug = slug.toLowerCase().trim();
  if (!cleanSlug || RESERVED_SLUGS.has(cleanSlug)) {
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, city, logo_url")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getPublicProductsByStoreId(
  storeId: string
): Promise<PublicProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, description, image_url, is_available")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("is_available", { ascending: false }) // Produk tersedia tampil lebih dulu
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((item) => ({
    ...item,
    price: Number(item.price),
  }));
}