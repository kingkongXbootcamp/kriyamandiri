import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPublicStoreBySlug, getPublicProductsByStoreId } from '@/lib/public-catalog';
import { sanitizeSafeHttpsUrl } from '@/lib/security';
import PublicCatalogClient from '@/components/PublicCatalogClient';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic';

interface PublicStorePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PublicStorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return {
      title: 'Toko Tidak Ditemukan | KRIYAMANDIRI',
      description: 'Halaman katalog toko tidak tersedia.',
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kriyamandiri.id').replace(/\/$/, '');

  const fullUrl = baseUrl.startsWith('http') ? `${baseUrl}/${store.slug}` : `https://${baseUrl}/${store.slug}`;

  const title = `${store.name} (${store.city}) - Katalog Online | KRIYAMANDIRI`;
  const description = store.description || `Lihat daftar produk dan harga terbaru dari ${store.name} di ${store.city}.`;
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
      siteName: 'KRIYAMANDIRI',
      type: 'website',
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
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.description || undefined,
    image: safeLogoUrl || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: store.city,
      addressCountry: 'ID',
    },
  };

  const safeJsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <div className='flex min-h-screen flex-col bg-slate-50'>
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: safeJsonLdString }} />

      {/* TOMBOL KEMBALI KE BERANDA */}
      <div className='w-full border-b border-slate-200 bg-white'>
        <div className='max-w-3xl mx-auto px-4 py-2 sm:px-6'>
          <Link href='/' className='inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition'>
            <ArrowLeft className='h-4 w-4' />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>

      <div className='flex-1'>
        <PublicCatalogClient store={store} products={products} />
      </div>

      <PublicFooter hasFloatingCartBar />
    </div>
  );
}
