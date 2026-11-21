import { createClient } from '@supabase/supabase-js';
import { RESERVED_SLUGS } from '@/lib/validators';

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  logo_url: string | null;
  whatsapp_number: string;
}

export interface PublicProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
}

function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[PUBLIC_CATALOG_ERROR] Env variable Supabase kosong di server:', {
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
  const cleanSlug = decodeURIComponent(slug || '')
    .toLowerCase()
    .trim();
  if (!cleanSlug || RESERVED_SLUGS.has(cleanSlug)) {
    return null;
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('stores').select('id, name, slug, description, city, logo_url, whatsapp_number').eq('slug', cleanSlug).eq('is_active', true).maybeSingle();

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal query tabel stores:', {
      slug: cleanSlug,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data;
}

export async function getPublicProductsByStoreId(storeId: string): Promise<PublicProduct[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, description, image_url, is_available')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('is_available', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal query tabel products:', {
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

// Fungsi Direktori Toko Publik
export async function getAllPublicStores(): Promise<PublicStore[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from('stores').select('id, name, slug, description, city, logo_url, whatsapp_number').eq('is_active', true).order('created_at', { ascending: false });

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal query tabel stores:', {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data || [];
}

export interface PublicProductWithStore extends PublicProduct {
  stores: {
    name: string;
    slug: string;
  } | null;
}

export async function getAllPublicProducts(): Promise<PublicProductWithStore[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id, name, price, description, image_url, is_available,
      stores!inner ( name, slug )
    `,
    )
    .eq('is_active', true)
    .eq('stores.is_active', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal ambil semua produk:', error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    price: Number(item.price),
    stores: Array.isArray(item.stores) ? item.stores[0] : item.stores,
  }));
}

/**
 * Pencarian produk global di seluruh toko yang berstatus aktif
 */
export async function searchAllProducts(query: string): Promise<PublicProductWithStore[]> {
  const cleanQuery = String(query || '')
    .trim()
    .slice(0, 100);
  if (!cleanQuery) {
    return getAllPublicProducts();
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  // Escape karakter wildcard LIKE/ILIKE PostgreSQL agar pencarian akurat
  const escapedPattern = cleanQuery.replace(/[\\%_]/g, '\\$&');

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id, name, price, description, image_url, is_available,
      stores!inner ( name, slug )
    `,
    )
    .eq('is_active', true)
    .eq('stores.is_active', true)
    .ilike('name', `%${escapedPattern}%`)
    .order('is_available', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal mencari produk global:', {
      query: cleanQuery,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    price: Number(item.price),
    stores: Array.isArray(item.stores) ? item.stores[0] : item.stores,
  }));
}
