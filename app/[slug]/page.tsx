import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicStoreBySlug,
  getPublicProductsByStoreId,
} from "@/lib/public-catalog";
import { sanitizeSafeHttpsUrl } from "@/lib/security";
import PublicCatalogClient from "@/components/PublicCatalogClient";
import PublicHeader from "@/components/PublicHeader";

export const dynamic = "force-dynamic";

interface PublicStorePageProps {
  params: Promise<{
    slug: string;
  }>;
}

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

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://kriyamandiri.id"
  ).replace(/\/$/, "");

  const fullUrl = baseUrl.startsWith("http")
    ? `${baseUrl}/${store.slug}`
    : `https://${baseUrl}/${store.slug}`;

  const title = `${store.name} (${store.city}) - Katalog Online | KRIYAMANDIRI`;
  const description =
    store.description ||
    `Lihat daftar produk dan harga terbaru dari ${store.name} di ${store.city}.`;
  const safeLogoUrl = sanitizeSafeHttpsUrl(store.logo_url);

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
      ...(safeLogoUrl ? { images: [{ url: safeLogoUrl, alt: store.name }] } : {}),
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
  const safeLogoUrl = sanitizeSafeHttpsUrl(store.logo_url);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description || undefined,
    image: safeLogoUrl || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: store.city,
      addressCountry: "ID",
    },
  };

  // Escape karakter '<' menjadi '\u003c' untuk mencegah XSS break-out dari tag </script>
  const safeJsonLdString = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdString }}
      />
        return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdString }}
      />
      <PublicHeader /> {/* <-- TAMBAHIN INI */}
      <PublicCatalogClient store={store} products={products} />
    </>
  );
      <PublicCatalogClient store={store} products={products} />
    </>
  );
}