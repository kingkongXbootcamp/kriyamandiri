import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicProductsByStoreId,
  getPublicStoreBySlug,
} from "@/lib/public-catalog";
import CheckoutClient from "@/components/CheckoutClient";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return {
      title: "Halaman Tidak Ditemukan | KRIYAMANDIRI",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Checkout - ${store.name} | KRIYAMANDIRI`,
    description: `Isi data pengiriman untuk memesan produk dari ${store.name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function StoreCheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  const products = await getPublicProductsByStoreId(store.id);

  return <CheckoutClient store={store} products={products} />;
}