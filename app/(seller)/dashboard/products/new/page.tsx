import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedSellerStore } from "@/actions/product";
import ProductForm from "@/components/ProductForm";

export const metadata = {
  title: "Tambah Produk | KRIYAMANDIRI",
  description: "Tambahkan produk baru ke katalog online toko Anda.",
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { user, store } = await getAuthenticatedSellerStore();

  // Jika toko belum dibuat, arahkan ke halaman profil toko yang sekarang sudah aktif
  if (!store) {
    redirect("/dashboard/profile");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Kembali ke Daftar Produk</span>
        </Link>
      </div>

      <ProductForm userId={user.id} />
    </div>
  );
}