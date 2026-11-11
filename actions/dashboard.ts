import { createClient } from "@/lib/supabase/server";

export interface DashboardData {
  store: {
    id: string;
    name: string;
    slug: string;
    city: string;
    logo_url: string | null;
  } | null;
  stats: {
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
  };
}

export async function getSellerDashboardData(): Promise<DashboardData> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesi pengguna tidak valid.");
  }

  // 1. Ambil data toko milik user
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, city, logo_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (storeError) {
    throw new Error(storeError.message);
  }

  // Jika toko belum dibuat
  if (!store) {
    return {
      store: null,
      stats: { totalProducts: 0, activeProducts: 0, outOfStockProducts: 0 }
    };
  }

  // 2. Query agregasi data produk riil (tanpa angka dummy)
  const [totalRes, activeRes, outOfStockRes] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", store.id),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("is_available", true),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("is_available", false),
  ]);

  return {
    store,
    stats: {
      totalProducts: totalRes.count || 0,
      activeProducts: activeRes.count || 0,
      outOfStockProducts: outOfStockRes.count || 0,
    },
  };
}