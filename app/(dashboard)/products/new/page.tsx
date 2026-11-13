import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedSellerStore } from "@/actions/product";
import ProductForm from "@/components/ProductForm";

export const metadata = {
  title: "Tambah Produk | KRIYAMANDIRI",
};

export default async function NewProductPage() {
  const { user, store } = await getAuthenticatedSellerStore();

  // Pastikan penjual sudah membuat profil toko sebelum menambah produk
  if (!store) {
    redirect("/dashboard/profile");
  }

  return <ProductForm userId={user.id} />;
}