"use server";

import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { sanitizeAndValidateWhatsApp } from "@/lib/validators";
import { checkRateLimit } from "@/lib/security";
import {
  ServerCartItemInput,
  ServerCartVerificationResult,
  VerifiedCartItem,
} from "@/types/cart";

const MAX_DISTINCT_CART_ITEMS = 50;

function createPublicServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
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

export async function verifyCartOnServer(
  storeSlug: string,
  clientItems: ServerCartItemInput[]
): Promise<ServerCartVerificationResult> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const rate = checkRateLimit(`verify-cart:${ip}`, 30, 60 * 1000);
  if (!rate.allowed) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors: [
        `Terlalu banyak permintaan verifikasi. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      ],
    };
  }

  const errors: string[] = [];

  if (!storeSlug || !Array.isArray(clientItems) || clientItems.length === 0) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors: ["Keranjang belanja kosong atau toko tidak valid."],
    };
  }

  if (clientItems.length > MAX_DISTINCT_CART_ITEMS) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors: [
        `Maksimal ${MAX_DISTINCT_CART_ITEMS} jenis produk dalam satu pesanan.`,
      ],
    };
  }

  const supabase = createPublicServerSupabase();
  if (!supabase) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors: ["Konfigurasi server database tidak tersedia."],
    };
  }

  // 1. Verifikasi toko aktif & nomor WhatsApp resmi toko berdasarkan slug
  const cleanSlug = decodeURIComponent(storeSlug).toLowerCase().trim();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, whatsapp_number, is_active")
    .eq("slug", cleanSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (storeError || !store) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors: ["Toko tidak ditemukan atau sedang nonaktif."],
    };
  }

  const storeWaCheck = sanitizeAndValidateWhatsApp(store.whatsapp_number || "");
  if (!storeWaCheck.isValid) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors: [
        "Nomor WhatsApp toko tujuan belum diatur dengan benar oleh penjual.",
      ],
    };
  }

  // 2. Gabungkan kuantitas & validasi angka kuantitas
  const quantityByProductId = new Map<string, number>();
  for (const rawItem of clientItems) {
    if (
      !rawItem ||
      typeof rawItem.productId !== "string" ||
      rawItem.productId.length > 64
    ) {
      errors.push("ID produk tidak valid.");
      continue;
    }

    const qty = Math.floor(Number(rawItem.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 999) {
      errors.push(
        "Jumlah pembelian produk tidak valid (minimal 1, maksimal 999)."
      );
      continue;
    }

    quantityByProductId.set(
      rawItem.productId,
      (quantityByProductId.get(rawItem.productId) || 0) + qty
    );
  }

  const productIds = Array.from(quantityByProductId.keys());
  if (productIds.length === 0) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors:
        errors.length > 0 ? errors : ["Tidak ada item valid di keranjang."],
    };
  }

  // 3. Ambil harga & status stok resmi dari database khusus milik toko tersebut
  const { data: dbProducts, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, is_active, is_available")
    .eq("store_id", store.id)
    .in("id", productIds);

  if (productsError || !dbProducts) {
    return {
      valid: false,
      items: [],
      subtotalAmount: 0,
      totalAmount: 0,
      errors: ["Gagal memverifikasi data produk dari server."],
    };
  }

  const dbProductMap = new Map(dbProducts.map((p) => [p.id, p]));
  const verifiedItems: VerifiedCartItem[] = [];
  let subtotalAmount = 0;

  // 4. Hitung ulang subtotal dan total harga berdasarkan harga resmi server
  for (const [productId, quantity] of quantityByProductId.entries()) {
    const dbProduct = dbProductMap.get(productId);

    if (!dbProduct || !dbProduct.is_active) {
      errors.push(
        "Salah satu produk di keranjang sudah tidak tersedia di toko ini."
      );
      continue;
    }

    if (!dbProduct.is_available) {
      errors.push(`Stok produk "${dbProduct.name}" sedang habis.`);
      continue;
    }

    const authoritativeUnitPrice = Number(dbProduct.price);
    if (
      !Number.isFinite(authoritativeUnitPrice) ||
      authoritativeUnitPrice < 0
    ) {
      errors.push(`Harga produk "${dbProduct.name}" tidak valid.`);
      continue;
    }

    const itemSubtotal = authoritativeUnitPrice * quantity;
    subtotalAmount += itemSubtotal;

    verifiedItems.push({
      productId: dbProduct.id,
      name: dbProduct.name,
      unitPrice: authoritativeUnitPrice,
      quantity,
      subtotal: itemSubtotal,
    });
  }

  return {
    valid: errors.length === 0 && verifiedItems.length > 0,
    storeId: store.id,
    storeName: store.name,
    storeSlug: store.slug,
    storeWhatsappNumber: storeWaCheck.formatted,
    items: verifiedItems,
    subtotalAmount,
    totalAmount: subtotalAmount,
    errors,
  };
}