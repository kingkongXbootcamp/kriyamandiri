'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isValidSlug, RESERVED_SLUGS, sanitizeAndValidateWhatsApp, validateStoreLogoUrl } from '@/lib/validators';
import { extractOwnedStoragePath } from '@/lib/image-compressor';
import { stripControlChars } from '@/lib/security';

export interface StoreInput {
  name: string;
  slug: string;
  description?: string;
  whatsapp_number: string;
  city: string;
  logo_url?: string;
}

export interface StoreRecord {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  whatsapp_number: string;
  city: string;
  logo_url: string;
}

export interface SaveStoreActionResult {
  success: boolean;
  error?: string;
  store?: StoreRecord;
}

function mapSupabaseStoreError(error: { code?: string; message?: string; details?: string; hint?: string }, fallbackMessage: string): string {
  switch (error.code) {
    case '42501':
      return 'Akses ditolak oleh kebijakan keamanan database (RLS). Anda tidak berhak mengubah toko ini.';
    case 'PGRST116':
      return 'Data toko tidak ditemukan atau Anda tidak berhak mengedit toko ini.';
    case '23505':
      return 'URL/Slug toko ini sudah dipakai toko lain. Silakan gunakan slug yang berbeda.';
    case '42703':
      return `Struktur kolom database belum sinkron (${error.message || 'kolom tidak ditemukan'}).`;
    default:
      return error.message ? `${fallbackMessage} (${error.message})` : fallbackMessage;
  }
}

export async function getCurrentUserStore(): Promise<StoreRecord | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Akses tidak diizinkan. Silakan login terlebih dahulu.');
  }

  const { data, error } = await supabase.from('stores').select('id, user_id, name, slug, description, whatsapp_number, city, logo_url').eq('user_id', user.id).maybeSingle();

  if (error) {
    console.error('[STORE_ACTION_ERROR] Gagal memuat profil toko:', {
      userId: user.id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error('Gagal memuat profil toko.');
  }

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    slug: data.slug,
    description: data.description || '',
    whatsapp_number: data.whatsapp_number,
    city: data.city,
    logo_url: data.logo_url || '',
  };
}

export async function checkSlugAvailability(slug: string, currentStoreId?: string): Promise<boolean> {
  const cleanSlug = slug.toLowerCase().trim();
  if (!isValidSlug(cleanSlug)) {
    return false;
  }

  const supabase = await createClient();
  let query = supabase.from('stores').select('id').eq('slug', cleanSlug);

  if (currentStoreId) {
    query = query.neq('id', currentStoreId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[STORE_ACTION_ERROR] Gagal mengecek ketersediaan slug:', {
      slug: cleanSlug,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return !data;
}

export async function saveStoreProfile(input: StoreInput, existingStoreId?: string): Promise<SaveStoreActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'Sesi login berakhir. Silakan login kembali.',
    };
  }

  const cleanName = stripControlChars(input.name || '').trim();
  if (cleanName.length < 3 || cleanName.length > 100) {
    return {
      success: false,
      error: 'Nama toko harus antara 3 hingga 100 karakter.',
    };
  }

  const cleanCity = stripControlChars(input.city || '').trim();
  if (cleanCity.length < 2 || cleanCity.length > 100) {
    return {
      success: false,
      error: 'Kota atau lokasi toko wajib diisi (2–100 karakter).',
    };
  }

  const cleanDescription = input.description ? stripControlChars(input.description, true).trim().slice(0, 300) : null;

  const cleanSlug = (input.slug || '').toLowerCase().trim();
  if (RESERVED_SLUGS.has(cleanSlug)) {
    return {
      success: false,
      error: `Slug "${cleanSlug}" dicadangkan oleh sistem. Silakan pilih nama tautan lain.`,
    };
  }

  if (!isValidSlug(cleanSlug)) {
    return {
      success: false,
      error: 'Format slug tidak valid. Gunakan minimal 3 karakter huruf kecil, angka, dan tanda strip (-).',
    };
  }

  const isSlugFree = await checkSlugAvailability(cleanSlug, existingStoreId);
  if (!isSlugFree) {
    return {
      success: false,
      error: 'Slug sudah dipakai toko lain. Silakan pilih tautan unik lainnya.',
    };
  }

  const phoneValidation = sanitizeAndValidateWhatsApp(input.whatsapp_number);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      error: 'Nomor WhatsApp tidak valid. Gunakan nomor aktif format Indonesia (contoh: 08123456789).',
    };
  }

  const logoValidation = validateStoreLogoUrl(input.logo_url);
  if (!logoValidation.valid) {
    return {
      success: false,
      error: 'URL logo toko tidak valid. Gunakan tautan gambar berawalan https://.',
    };
  }

  const payload = {
    name: cleanName,
    slug: cleanSlug,
    description: cleanDescription,
    whatsapp_number: phoneValidation.formatted,
    city: cleanCity,
    logo_url: logoValidation.sanitizedUrl,
    updated_at: new Date().toISOString(),
  };

  if (existingStoreId) {
    // Ambil data toko lama untuk memverifikasi kepemilikan & mendapatkan slug lama
    const { data: currentStore, error: fetchError } = await supabase.from('stores').select('id, user_id, slug').eq('id', existingStoreId).maybeSingle();

    if (fetchError) {
      console.error('[STORE_ACTION_ERROR] Gagal membaca toko sebelum update:', {
        storeId: existingStoreId,
        userId: user.id,
        code: fetchError.code,
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
      });
      return {
        success: false,
        error: mapSupabaseStoreError(fetchError, 'Gagal memeriksa kepemilikan toko.'),
      };
    }

    if (!currentStore || currentStore.user_id !== user.id) {
      console.error('[STORE_ACTION_ERROR] Kepemilikan toko tidak cocok saat update:', {
        storeId: existingStoreId,
        authenticatedUserId: user.id,
        ownerUserId: currentStore?.user_id || null,
      });
      return {
        success: false,
        error: 'Anda tidak berhak mengedit toko ini.',
      };
    }

    const { data, error } = await supabase
      .from('stores')
      .update(payload)
      .eq('id', existingStoreId)
      .eq('user_id', user.id)
      .select('id, user_id, name, slug, description, whatsapp_number, city, logo_url')
      .single();

    if (error) {
      console.error('[STORE_ACTION_ERROR] Gagal UPDATE tabel stores:', {
        storeId: existingStoreId,
        userId: user.id,
        payload,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        success: false,
        error: mapSupabaseStoreError(error, 'Gagal memperbarui profil toko.'),
      };
    }

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile');
    if (currentStore.slug && currentStore.slug !== cleanSlug) {
      revalidatePath(`/${currentStore.slug}`);
    }
    revalidatePath(`/${cleanSlug}`);

    return {
      success: true,
      store: {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        whatsapp_number: data.whatsapp_number,
        city: data.city,
        logo_url: data.logo_url || '',
      },
    };
  } else {
    // Aturan bisnis MVP: 1 user = 1 toko
    const { data: alreadyOwned } = await supabase.from('stores').select('id').eq('user_id', user.id).maybeSingle();

    if (alreadyOwned) {
      return {
        success: false,
        error: 'Akun Anda sudah memiliki toko terdaftar.',
      };
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({
        ...payload,
        user_id: user.id,
      })
      .select('id, user_id, name, slug, description, whatsapp_number, city, logo_url')
      .single();

    if (error) {
      console.error('[STORE_ACTION_ERROR] Gagal INSERT tabel stores:', {
        userId: user.id,
        payload,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        success: false,
        error: mapSupabaseStoreError(error, 'Gagal mendaftarkan toko baru.'),
      };
    }

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile');
    revalidatePath(`/${cleanSlug}`);

    return {
      success: true,
      store: {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        whatsapp_number: data.whatsapp_number,
        city: data.city,
        logo_url: data.logo_url || '',
      },
    };
  }
}

/**
 * Menghapus toko milik pengguna yang sedang login secara permanen.
 * Seluruh produk terkait otomatis terhapus melalui relasi ON DELETE CASCADE.
 */
export async function deleteStore(storeId: string): Promise<{ success: boolean }> {
  const cleanStoreId = String(storeId || '').trim();
  if (!cleanStoreId) {
    throw new Error('ID toko tidak valid.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Sesi login berakhir. Silakan login kembali.');
  }

  // 1. Verifikasi kepemilikan toko (user_id harus cocok dengan user aktif)
  const { data: ownedStore, error: fetchError } = await supabase.from('stores').select('id, user_id, slug').eq('id', cleanStoreId).eq('user_id', user.id).maybeSingle();

  if (fetchError || !ownedStore) {
    throw new Error('Toko tidak ditemukan atau Anda tidak memiliki hak akses untuk menghapusnya.');
  }

  // 2. Ambil daftar URL foto produk untuk dibersihkan dari Storage agar kuota tetap hemat
  const { data: storeProducts } = await supabase.from('products').select('image_url').eq('store_id', ownedStore.id);

  // 3. Hapus data toko (otomatis menghapus produk terkait via ON DELETE CASCADE)
  const { error: deleteError } = await supabase.from('stores').delete().eq('id', ownedStore.id).eq('user_id', user.id);

  if (deleteError) {
    console.error('[STORE_ACTION_ERROR] Gagal DELETE tabel stores:', {
      storeId: ownedStore.id,
      userId: user.id,
      code: deleteError.code,
      message: deleteError.message,
    });
    throw new Error('Gagal menghapus toko. Silakan coba lagi.');
  }

  // 4. Bersihkan file gambar produk di bucket 'product-images' milik user
  if (storeProducts && storeProducts.length > 0) {
    const pathsToRemove = storeProducts.map((item) => extractOwnedStoragePath(item.image_url, user.id)).filter((path): path is string => Boolean(path));

    if (pathsToRemove.length > 0) {
      await supabase.storage.from('product-images').remove(pathsToRemove);
    }
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard/products');
  revalidatePath(`/${ownedStore.slug}`);

  return { success: true };
}
