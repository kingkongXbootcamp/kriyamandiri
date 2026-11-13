"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProductInput } from "@/lib/product-validators";
import { extractOwnedStoragePath } from "@/lib/image-compressor";

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
  created_at?: string;
}

export async function getAuthenticatedSellerStore() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesi login berakhir. Silakan masuk kembali.");
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

// Ambil seluruh daftar produk milik toko penjual
export async function getSellerProducts(): Promise<ProductRecord[]> {
  const { store } = await getAuthenticatedSellerStore();
  if (!store) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, store_id, name, price, description, image_url, is_available, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil daftar produk: ${error.message}`);
  }

  return (data || []).map((item) => ({
    ...item,
    price: Number(item.price),
  }));
}

// Ambil 1 produk milik toko untuk diedit
export async function getOwnedProductById(productId: string): Promise<ProductRecord | null> {
  const { store } = await getAuthenticatedSellerStore();
  if (!store) return null;

  const supabase = await createClient();
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

// Simpan produk baru atau edit produk + hapus foto lama secara aman jika diganti
export async function saveProduct(
  payload: ProductPayload,
  productId?: string
): Promise<{ success: boolean; productId: string }> {
  const { user, store } = await getAuthenticatedSellerStore();

  if (!store) {
    throw new Error("Profil toko belum dibuat. Silakan lengkapi profil toko terlebih dahulu.");
  }

  const validation = validateProductInput({
    name: payload.name,
    price: payload.price,
    description: payload.description,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const supabase = await createClient();

  const cleanData = {
    name: payload.name.trim(),
    price: Math.round(payload.price),
    description: payload.description?.trim() || null,
    image_url: payload.image_url || null,
    is_available: Boolean(payload.is_available),
    updated_at: new Date().toISOString(),
  };

  if (productId) {
    // Ambil data lama termasuk image_url sebelum diupdate
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, store_id, image_url")
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

    // Jika foto diganti dan database sudah berhasil disimpan, hapus file foto lama dari storage
    if (
      existingProduct.image_url &&
      existingProduct.image_url !== cleanData.image_url
    ) {
      const oldStoragePath = extractOwnedStoragePath(existingProduct.image_url, user.id);
      if (oldStoragePath) {
        await supabase.storage.from("product-images").remove([oldStoragePath]);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    return { success: true, productId: updated.id };
  } else {
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

// Ubah cepat status Tersedia / Habis dari halaman daftar produk
export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<{ success: boolean }> {
  const { store } = await getAuthenticatedSellerStore();
  if (!store) {
    throw new Error("Toko tidak ditemukan.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    throw new Error(`Gagal mengubah status produk: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  return { success: true };
}

// Hapus produk beserta file gambarnya dari cloud storage
export async function deleteProduct(productId: string): Promise<{ success: boolean }> {
  const { user, store } = await getAuthenticatedSellerStore();
  if (!store) {
    throw new Error("Toko tidak ditemukan.");
  }

  const supabase = await createClient();

  // 1. Cek kepemilikan dan ambil URL gambar sebelum menghapus record
  const { data: product } = await supabase
    .from("products")
    .select("id, image_url")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!product) {
    throw new Error("Produk tidak ditemukan atau Anda tidak berhak menghapusnya.");
  }

  // 2. Hapus record produk di database
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);

  if (deleteError) {
    throw new Error(`Gagal menghapus produk: ${deleteError.message}`);
  }

  // 3. Hapus file foto dari Supabase Storage jika ada
  if (product.image_url) {
    const storagePath = extractOwnedStoragePath(product.image_url, user.id);
    if (storagePath) {
      await supabase.storage.from("product-images").remove([storagePath]);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  return { success: true };
}

// Hapus file sementara jika user mengganti foto berkali-kali sebelum menekan tombol Simpan
export async function removeOrphanedUpload(imageUrl: string): Promise<void> {
  const { user } = await getAuthenticatedSellerStore();
  const storagePath = extractOwnedStoragePath(imageUrl, user.id);
  if (!storagePath) return;

  const supabase = await createClient();
  await supabase.storage.from("product-images").remove([storagePath]);
}