"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isValidSlug,
  sanitizeAndValidateWhatsApp,
  validateStoreLogoUrl,
} from "@/lib/validators";
import { stripControlChars } from "@/lib/security";

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

export async function getCurrentUserStore(): Promise<StoreRecord | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Akses tidak diizinkan. Silakan login terlebih dahulu.");
  }

  const { data, error } = await supabase
    .from("stores")
    .select("id, user_id, name, slug, description, whatsapp_number, city, logo_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Gagal memuat profil toko.");
  }

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    slug: data.slug,
    description: data.description || "",
    whatsapp_number: data.whatsapp_number,
    city: data.city,
    logo_url: data.logo_url || "",
  };
}

export async function checkSlugAvailability(
  slug: string,
  currentStoreId?: string
): Promise<boolean> {
  const cleanSlug = slug.toLowerCase().trim();
  if (!isValidSlug(cleanSlug)) {
    return false;
  }

  const supabase = await createClient();
  let query = supabase.from("stores").select("id").eq("slug", cleanSlug);

  if (currentStoreId) {
    query = query.neq("id", currentStoreId);
  }

  const { data } = await query.maybeSingle();
  return !data;
}

export async function saveStoreProfile(
  input: StoreInput,
  existingStoreId?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesi login berakhir. Silakan login kembali.");
  }

  const cleanName = stripControlChars(input.name || "").trim();
  if (cleanName.length < 3 || cleanName.length > 100) {
    throw new Error("Nama toko harus antara 3 hingga 100 karakter.");
  }

  const cleanCity = stripControlChars(input.city || "").trim();
  if (cleanCity.length < 2 || cleanCity.length > 100) {
    throw new Error("Kota atau lokasi toko wajib diisi (2–100 karakter).");
  }

  const cleanDescription = input.description
    ? stripControlChars(input.description, true).trim().slice(0, 300)
    : null;

  const cleanSlug = (input.slug || "").toLowerCase().trim();
  if (!isValidSlug(cleanSlug)) {
    throw new Error(
      "Format slug tidak valid atau menggunakan nama sistem yang dicadangkan."
    );
  }

  const isSlugFree = await checkSlugAvailability(cleanSlug, existingStoreId);
  if (!isSlugFree) {
    throw new Error(
      "URL/Slug toko ini sudah digunakan toko lain. Silakan pilih yang lain."
    );
  }

  const phoneValidation = sanitizeAndValidateWhatsApp(input.whatsapp_number);
  if (!phoneValidation.isValid) {
    throw new Error(
      "Nomor WhatsApp tidak valid. Gunakan nomor aktif format Indonesia (contoh: 08123456789)."
    );
  }

  const logoValidation = validateStoreLogoUrl(input.logo_url);
  if (!logoValidation.valid) {
    throw new Error(
      "URL logo toko tidak valid. Gunakan tautan gambar berawalan https://."
    );
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
    const { data, error } = await supabase
      .from("stores")
      .update(payload)
      .eq("id", existingStoreId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      throw new Error("Gagal memperbarui profil toko.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    revalidatePath(`/${cleanSlug}`);
    return { success: true, store: data };
  } else {
    // Aturan bisnis MVP: 1 user = 1 toko
    const { data: alreadyOwned } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (alreadyOwned) {
      throw new Error("Akun Anda sudah memiliki toko terdaftar.");
    }

    const { data, error } = await supabase
      .from("stores")
      .insert({
        ...payload,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error("Gagal mendaftarkan toko baru.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    revalidatePath(`/${cleanSlug}`);
    return { success: true, store: data };
  }
}