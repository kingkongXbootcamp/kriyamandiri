import { createClient } from '@supabase/supabase-js';

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  logo_url: string | null;
  origin_area_id?: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  price: number;
  weight_grams?: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
}

export interface PublicProductStoreSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
}

export interface PublicProductWithStore extends PublicProduct {
  stores: PublicProductStoreSummary | null;
}

interface RawProductWithStoreRow {
  id: string;
  name: string;
  price: number | string;
  weight_grams?: number | string | null;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  stores: PublicProductStoreSummary | PublicProductStoreSummary[] | null;
}

const RESERVED_SLUGS = new Set(['dashboard', 'login', 'register', 'auth', 'api', 'admin', 'settings', 'favicon.ico', 'robots.txt', 'sitemap.xml']);

function isInternalOrInvalidSlug(cleanSlug: string): boolean {
  if (!cleanSlug || RESERVED_SLUGS.has(cleanSlug)) {
    return true;
  }
  // Abaikan request internal Next.js dev server (__nextjs_original-stack-frames, dll.) & browser
  if (cleanSlug.startsWith('__nextjs') || cleanSlug.startsWith('_next') || cleanSlug.startsWith('.')) {
    return true;
  }
  return false;
}

function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('project-id-anda')) {
    console.error('[PUBLIC_CATALOG_ERROR] NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi dengan kredensial asli di .env.local:', {
      supabaseUrl: supabaseUrl || '(kosong)',
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

function normalizeProductWithStore(row: RawProductWithStoreRow): PublicProductWithStore {
  const normalizedStore = Array.isArray(row.stores) ? row.stores[0] || null : row.stores || null;

  return {
    id: row.id,
    name: row.name,
    price: Number(row.price) || 0,
    weight_grams: Number(row.weight_grams) > 0 ? Number(row.weight_grams) : 250,
    description: row.description,
    image_url: row.image_url,
    is_available: Boolean(row.is_available),
    stores: normalizedStore
      ? {
          id: normalizedStore.id,
          name: normalizedStore.name,
          slug: normalizedStore.slug,
          city: normalizedStore.city,
        }
      : null,
  };
}

/**
 * Mengambil seluruh produk aktif dari semua toko untuk halaman depan (HomePage).
 */
export async function getAllPublicProducts(limit = 48): Promise<PublicProductWithStore[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      price,
      weight_grams,
      description,
      image_url,
      is_available,
      stores!inner (
        id,
        name,
        slug,
        city
      )
    `,
    )
    .eq('is_active', true)
    .order('is_available', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal query getAllPublicProducts:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return [];
  }

  return ((data || []) as unknown as RawProductWithStoreRow[]).map(normalizeProductWithStore);
}

/**
 * Mencari produk aktif berdasarkan nama produk di semua toko.
 */
export async function searchAllProducts(query: string, limit = 48): Promise<PublicProductWithStore[]> {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return getAllPublicProducts(limit);
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return [];
  }

  const escapedQuery = cleanQuery.replace(/[\\%_]/g, (char) => `\\${char}`);

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      price,
      weight_grams,
      description,
      image_url,
      is_available,
      stores!inner (
        id,
        name,
        slug,
        city
      )
    `,
    )
    .eq('is_active', true)
    .ilike('name', `%${escapedQuery}%`)
    .order('is_available', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal query searchAllProducts:', {
      query: cleanQuery,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return [];
  }

  return ((data || []) as unknown as RawProductWithStoreRow[]).map(normalizeProductWithStore);
}

export async function getPublicStoreBySlug(slug: string): Promise<PublicStore | null> {
  const cleanSlug = decodeURIComponent(slug || '')
    .toLowerCase()
    .trim();

  if (isInternalOrInvalidSlug(cleanSlug)) {
    return null;
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('stores').select('id, name, slug, description, city, logo_url, origin_area_id').eq('slug', cleanSlug).maybeSingle();

  if (error) {
    console.error('[PUBLIC_CATALOG_ERROR] Gagal query tabel stores:', {
      slug: cleanSlug,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  if (!data) {
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
    .select('id, name, price, weight_grams, description, image_url, is_available')
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
    weight_grams: Number(item.weight_grams) > 0 ? Number(item.weight_grams) : 250,
  }));
}
