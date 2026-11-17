"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProductInput } from "@/lib/product-validators";
import { extractOwnedStoragePath } from "@/lib/image-compressor";
import {
  sanitizeOwnedStorageImageUrl,
  stripControlChars,
} from "@/lib/security";

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
    throw new Error("Gagal memuat data toko.");
  }

  return { user, store };
}

export async function getSellerProducts(): Promise<ProductRecord[]> {
  const { store } = await getAuthenticatedSellerStore();
  if (!store) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, store_id, name, price, description, image_url, is_available, created_at"
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Gagal mengambil daftar produk.");
  }

  return (data || []).map((item) => ({
    ...item,
    price: Number(item.price),
  }));
}

export async function getOwnedProductById(
  productId: string
): Promise<ProductRecord | null> {
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

export async function saveProduct(
  payload: ProductPayload,
  productId?: string
): Promise<{ success: boolean; productId: string }> {
  const { user, store } = await getAuthenticatedSellerStore();
  if (!store) {
    throw new Error(
      "Profil toko belum dibuat. Silakan lengkapi profil toko terlebih dahulu."
    );
  }

  const cleanName = stripControlChars(payload.name || "").trim();
  const cleanDescription = payload.description
    ? stripControlChars(payload.description, true).trim()
    : undefined;

  const validation = validateProductInput({
    name: cleanName,
    price: payload.price,
    description: cleanDescription,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Verifikasi bahwa image_url benar-benar berasal dari bucket storage milik user.id ini
  const imageValidation = sanitizeOwnedStorageImageUrl(
    payload.image_url,
    user.id
  );
  if (!imageValidation.valid) {
    throw new Error(
      "URL foto produk tidak sah. Unggah foto melalui formulir produk."
    );
  }

  const supabase = await createClient();
  const cleanData = {
    name: cleanName,
    price: Math.round(payload.price),
    description: cleanDescription || null,
    image_url: imageValidation.sanitizedUrl,
    is_available: Boolean(payload.is_available),
    updated_at: new Date().toISOString(),
  };

  if (productId) {
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, store_id, image_url")
      .eq("id", productId)
      .eq("store_id", store.id)
      .maybeSingle();

    if (!existingProduct) {
      throw new Error(
        "Produk tidak ditemukan atau Anda tidak memiliki akses untuk mengubahnya."
      );
    }

    const { data: updated, error } = await supabase
      .from("products")
      .update(cleanData)
      .eq("id", productId)
      .eq("store_id", store.id)
      .select("id")
      .single();

    if (error) {
      throw new Error("Gagal memperbarui produk.");
    }

    if (
      existingProduct.image_url &&
      existingProduct.image_url !== cleanData.image_url
    ) {
      const oldStoragePath = extractOwnedStoragePath(
        existingProduct.image_url,
        user.id
      );
      if (oldStoragePath) {
        await supabase.storage.from("product-images").remove([oldStoragePath]);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    revalidatePath(`/${store.slug}`);
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
      throw new Error("Gagal menambahkan produk.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    revalidatePath(`/${store.slug}`);
    return { success: true, productId: inserted.id };
  }
}

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
      is_available: Boolean(isAvailable),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    throw new Error("Gagal mengubah status produk.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath(`/${store.slug}`);
  return { success: true };
}

export async function deleteProduct(
  productId: string
): Promise<{ success: boolean }> {
  const { user, store } = await getAuthenticatedSellerStore();
  if (!store) {
    throw new Error("Toko tidak ditemukan.");
  }

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, image_url")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!product) {
    throw new Error(
      "Produk tidak ditemukan atau Anda tidak berhak menghapusnya."
    );
  }

  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);

  if (deleteError) {
    throw new Error("Gagal menghapus produk.");
  }

  if (product.image_url) {
    const storagePath = extractOwnedStoragePath(product.image_url, user.id);
    if (storagePath) {
      await supabase.storage.from("product-images").remove([storagePath]);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath(`/${store.slug}`);
  return { success: true };
}

export async function removeOrphanedUpload(imageUrl: string): Promise<void> {
  const { user } = await getAuthenticatedSellerStore();
  const storagePath = extractOwnedStoragePath(imageUrl, user.id);
  if (!storagePath) return;

  const supabase = await createClient();
  await supabase.storage.from("product-images").remove([storagePath]);
}