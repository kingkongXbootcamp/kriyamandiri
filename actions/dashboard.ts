"use server";

import { createClient } from "@/lib/supabase/server";

export interface SellerDashboardStats {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
}

export interface SellerStoreSummary {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface SellerDashboardPayload {
  store: SellerStoreSummary | null;
  stats: SellerDashboardStats;
}

export async function getSellerDashboardData(): Promise<SellerDashboardPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesi tidak valid. Silakan login kembali.");
  }

  // 1. Ambil profil toko milik user yang sedang login
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (storeError) {
    throw new Error(`Gagal memuat data toko: ${storeError.message}`);
  }

  // Jika user belum mendaftarkan profil toko
  if (!store) {
    return {
      store: null,
      stats: {
        totalProducts: 0,
        activeProducts: 0,
        outOfStockProducts: 0,
      },
    };
  }

  // 2. Hitung statistik produk riil dari database (tanpa angka dummy)
  const [totalQuery, activeQuery, outOfStockQuery] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("is_available", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("is_available", false),
  ]);

  return {
    store,
    stats: {
      totalProducts: totalQuery.count ?? 0,
      activeProducts: activeQuery.count ?? 0,
      outOfStockProducts: outOfStockQuery.count ?? 0,
    },
  };
}