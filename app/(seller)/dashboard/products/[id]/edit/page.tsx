import React from "react";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedSellerStore, getOwnedProductById } from "@/actions/product";
import ProductForm from "@/components/ProductForm";

export const metadata = {
  title: "Edit Produk | KRIYAMANDIRI",
};

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { user, store } = await getAuthenticatedSellerStore();

  if (!store) {
    redirect("/dashboard/profile");
  }

  // Ambil produk hanya jika milik toko pengguna yang sedang login
  const product = await getOwnedProductById(params.id);

  if (!product) {
    notFound();
  }

  return <ProductForm userId={user.id} initialData={product} />;
}