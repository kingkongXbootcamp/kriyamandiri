"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProductInput } from "@/lib/product-validators";

export interface ProductPayload {
  name: string;
  price: number;
  description?: string;
  image_url?: string | null;
  is_available: boolean;
}

export interface ProductRecord {
  id: string;
  store_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
}

// Ambil toko milik pengguna yang sedang login
export async function getAuthenticatedSellerStore() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
  }

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, user_id, name, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat data toko: ${error.message}`);
  }

  return { user, store };
}

// Ambil 1 produk untuk diedit (hanya jika milik toko pengguna tersebut)
export async function getOwnedProductById(productId: string): Promise<ProductRecord | null> {
  const { store } = await getAuthenticatedSellerStore();
  if (!store) return null;

  const supabase = createClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, store_id, name, price, description, image_url, is_available")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (error || !product) {
    return null;
  }

  return {
    ...product,
    price: Number(product.price),
  };
}

// Simpan produk baru atau perbarui produk yang sudah ada
export async function saveProduct(
  payload: ProductPayload,
  productId?: string
): Promise<{ success: boolean; productId: string }> {
  const { store } = await getAuthenticatedSellerStore();

  if (!store) {
    throw new Error("Anda belum memiliki toko. Silakan buat profil toko terlebih dahulu.");
  }

  const validation = validateProductInput({
    name: payload.name,
    price: payload.price,
    description: payload.description,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const supabase = createClient();

  const cleanData = {
    name: payload.name.trim(),
    price: Math.round(payload.price),
    description: payload.description?.trim() || null,
    image_url: payload.image_url || null,
    is_available: Boolean(payload.is_available),
    updated_at: new Date().toISOString(),
  };

  if (productId) {
    // Mode Edit: Pastikan produk benar-benar milik toko pengguna ini
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, store_id")
      .eq("id", productId)
      .eq("store_id", store.id)
      .maybeSingle();

    if (!existingProduct) {
      throw new Error("Produk tidak ditemukan atau Anda tidak memiliki akses untuk mengubahnya.");
    }

    const { data: updated, error } = await supabase
      .from("products")
      .update(cleanData)
      .eq("id", productId)
      .eq("store_id", store.id)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Gagal memperbarui produk: ${error.message}`);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    return { success: true, productId: updated.id };
  } else {
    // Mode Tambah Baru: Hubungkan otomatis dengan store_id pemilik
    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        ...cleanData,
        store_id: store.id,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Gagal menambahkan produk: ${error.message}`);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    return { success: true, productId: inserted.id };
  }
}