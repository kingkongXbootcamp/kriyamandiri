import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedSellerStore, getSellerProducts } from "@/actions/product";
import ProductListClient from "@/components/ProductListClient";

export const metadata = {
  title: "Daftar Produk | KRIYAMANDIRI",
  description: "Kelola daftar produk dan ketersediaan stok toko Anda.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { store } = await getAuthenticatedSellerStore();

  if (!store) {
    redirect("/dashboard/profile");
  }

  const products = await getSellerProducts();

  return <ProductListClient initialProducts={products} />;
}