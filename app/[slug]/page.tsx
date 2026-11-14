import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicStoreBySlug,
  getPublicProductsByStoreId,
} from "@/lib/public-catalog";
import PublicCatalogClient from "@/components/PublicCatalogClient";

interface PublicStorePageProps {
  params: {
    slug: string;
  };
}

// SEO Dasar & OpenGraph Preview untuk WhatsApp / Media Sosial
export async function generateMetadata({
  params,
}: PublicStorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return {
      title: "Toko Tidak Ditemukan | KRIYAMANDIRI",
      description: "Halaman katalog toko tidak tersedia.",
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://kriyamandiri.id").replace(
    /\/$/,
    ""
  );
  const fullUrl = baseUrl.startsWith("http")
    ? `${baseUrl}/${store.slug}`
    : `https://${baseUrl}/${store.slug}`;

  const title = `${store.name} (${store.city}) - Katalog Online | KRIYAMANDIRI`;
  const description =
    store.description ||
    `Lihat daftar produk dan harga terbaru dari ${store.name} di ${store.city}.`;

  return {
    title,
    description,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: `${store.name} - Katalog Online`,
      description,
      url: fullUrl,
      siteName: "KRIYAMANDIRI",
      type: "website",
      ...(store.logo_url ? { images: [{ url: store.logo_url, alt: store.name }] } : {}),
    },
  };
}

export default async function PublicStorePage({ params }: PublicStorePageProps) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  const products = await getPublicProductsByStoreId(store.id);

  // Structured Data JSON-LD untuk SEO Mesin Pencari
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description || undefined,
    image: store.logo_url || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: store.city,
      addressCountry: "ID",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicCatalogClient store={store} products={products} />
    </>
  );
}