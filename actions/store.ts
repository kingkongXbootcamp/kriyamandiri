"use server";
import { createClient } from "@/lib/supabase/server"; // Sesuaikan path client Supabase Anda
import { isValidSlug, sanitizeAndValidateWhatsApp } from "@/lib/validators";

export interface StoreInput {
  name: string;
  slug: string;
  description?: string;
  whatsapp_number: string;

  logo_url?: string;
}

// 1. Ambil data toko milik pengguna yang sedang login
export async function getCurrentUserStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Akses tidak diizinkan. Silakan login terlebih dahulu.");

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// 2. Cek apakah slug sudah dipakai toko lain
export async function checkSlugAvailability(slug: string, currentStoreId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from("stores")
    .select("id")
    .eq("slug", slug);

  if (currentStoreId) {
    query = query.neq("id", currentStoreId);
  }

  const { data } = await query.maybeSingle();
  return !data; // True jika belum ada yang pakai
}

// 3. Simpan Toko (Buat Baru atau Update Profil)
export async function saveStoreProfile(input: StoreInput, existingStoreId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Sesi login berakhir.");

  // Validasi Slug
  if (!isValidSlug(input.slug)) {
    throw new Error("Format slug tidak valid. Gunakan huruf kecil, angka, dan tanda strip (-).");
  }

  const isSlugFree = await checkSlugAvailability(input.slug, existingStoreId);
  if (!isSlugFree) {
    throw new Error("URL/Slug toko ini sudah digunakan toko lain. Silakan pilih yang lain.");
  }

  // Validasi Nomor WhatsApp
  const phoneValidation = sanitizeAndValidateWhatsApp(input.whatsapp_number);
  if (!phoneValidation.isValid) {
    throw new Error("Nomor WhatsApp tidak valid. Pastikan nomor aktif dengan format Indonesia (contoh: 08123456789).");
  }

  const payload = {
    name: input.name.trim(),
    slug: input.slug.trim(),
    description: input.description?.trim() || null,
    whatsapp_number: phoneValidation.formatted,
    logo_url: input.logo_url || null,
    updated_at: new Date().toISOString(),
  };

  if (existingStoreId) {
    // Mode Update: Kunci strictly pada user_id pemilik
    const { data, error } = await supabase
      .from("stores")
      .update(payload)
      .eq("id", existingStoreId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, store: data };
  } else {
    // Mode Pendaftaran Baru
    const { data, error } = await supabase
      .from("stores")
      .insert({
        ...payload,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, store: data };
  }
}