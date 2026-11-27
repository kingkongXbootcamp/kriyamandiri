import Link from 'next/link';
import Image from 'next/image';
import { Store, Search, X, ImageOff, PackageSearch, ShoppingBag, ArrowUpRight, User, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAllPublicProducts, searchAllProducts, PublicProductWithStore } from '@/lib/public-catalog';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{
    q?: string | string[];
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedParams = await searchParams;
  const rawQuery = Array.isArray(resolvedParams?.q) ? resolvedParams.q[0] : resolvedParams?.q;
  const searchQuery = (rawQuery || '').trim();
  const isSearching = searchQuery.length > 0;

  // Cek status sesi penjual di server dan ambil daftar produk secara paralel
  const supabase = await createClient();
  const [{ data: authData }, products] = await Promise.all([supabase.auth.getUser(), isSearching ? searchAllProducts(searchQuery) : getAllPublicProducts()]);

  const isLoggedIn = Boolean(authData?.user);

  return (
    <div className='flex min-h-screen flex-col bg-slate-50'>
      {/* Header Global Responsif */}
      <header className='sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm'>
        <div className='mx-auto max-w-5xl px-4 py-2.5 sm:px-6'>
          <div className='flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3'>
            {/* Kiri: Logo Resmi & Nama KRIYAMANDIRI */}
            <Link href='/' className='inline-flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl pr-1 transition hover:opacity-90'>
              <div className='relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-xs sm:h-11 sm:w-11'>
                <Image src='/kriyamandiri-logo.webp' alt='Logo KRIYAMANDIRI' width={44} height={44} priority className='h-full w-full object-contain' />
              </div>
              <div className='flex flex-col'>
                <span className='text-sm font-extrabold tracking-tight text-slate-900 sm:text-lg'>KRIYAMANDIRI</span>
                <span className='hidden text-[10px] font-medium text-slate-500 sm:block'>Katalog UMKM Indonesia</span>
              </div>
            </Link>

            {/* Kanan (Baris 1 di Mobile, Paling Kanan di Desktop): Member Area & Buka Toko */}
            <div className='flex shrink-0 items-center gap-1.5 sm:order-3 sm:gap-2'>
              {isLoggedIn ? (
                <Link
                  href='/dashboard'
                  className='inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98] sm:px-3.5 sm:text-sm'
                >
                  <LayoutDashboard className='h-4 w-4 shrink-0 text-emerald-700' />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <Link
                  href='/login'
                  className='inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:px-3.5 sm:text-sm'
                >
                  <User className='h-4 w-4 shrink-0 text-slate-600' />
                  <span>Masuk Penjual</span>
                </Link>
              )}

              <Link
                href={isLoggedIn ? '/dashboard' : '/register'}
                className='inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.98] sm:px-4 sm:text-sm'
              >
                <Store className='h-4 w-4 shrink-0' />
                <span>Buka Toko</span>
              </Link>
            </div>

            {/* Tengah (Full-width Baris 2 di Mobile, Tengah di Desktop): Search Bar Global */}
            <form action='/' method='GET' role='search' className='order-3 w-full sm:order-2 sm:max-w-md sm:flex-1'>
              <div className='relative flex items-center'>
                <Search className='pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400' />
                <input
                  type='text'
                  name='q'
                  defaultValue={searchQuery}
                  inputMode='search'
                  enterKeyHint='search'
                  placeholder='Cari produk di semua toko...'
                  aria-label='Cari produk di semua toko'
                  className='h-11 w-full rounded-xl border border-slate-200 bg-slate-100/80 pl-10 pr-24 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm'
                />

                {isSearching && (
                  <Link
                    href='/'
                    aria-label='Hapus pencarian'
                    className='absolute right-14 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800'
                  >
                    <X className='h-4 w-4' />
                  </Link>
                )}

                <button
                  type='submit'
                  className='absolute right-1.5 inline-flex h-8 min-w-[44px] items-center justify-center rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95'
                >
                  Cari
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Konten Utama: Grid Produk Lintas Toko */}
      <main className='mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6'>
        {/* Bar Judul & Status Pencarian */}
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h1 className='text-lg font-extrabold text-slate-900 sm:text-xl'>{isSearching ? `Hasil Pencarian "${searchQuery}"` : 'Produk Terbaru'}</h1>
            <p className='mt-0.5 text-xs text-slate-500'>
              {isSearching ? `Ditemukan ${products.length} produk dari berbagai toko UMKM` : 'Jelajahi produk pilihan UMKM dan pesan langsung via WhatsApp'}
            </p>
          </div>

          {isSearching && (
            <Link href='/' className='inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50'>
              <X className='h-3.5 w-3.5' />
              <span>Tampilkan Semua</span>
            </Link>
          )}
        </div>

        {/* Empty State / Grid Produk 2 Kolom Mobile & 4 Kolom Desktop */}
        {products.length === 0 ? (
          <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400'>
              {isSearching ? <PackageSearch className='h-6 w-6' /> : <ShoppingBag className='h-6 w-6' />}
            </div>
            <h2 className='mt-4 text-base font-bold text-slate-900'>{isSearching ? 'Produk tidak ditemukan' : 'Belum ada produk yang dijual'}</h2>
            <p className='mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm'>
              {isSearching
                ? `Tidak ada produk yang cocok dengan kata kunci "${searchQuery}". Coba gunakan kata kunci lain.`
                : 'Jadilah UMKM pertama yang membuka katalog online dan menerima pesanan langsung via WhatsApp.'}
            </p>
            <div className='mt-5'>
              {isSearching ? (
                <Link href='/' className='inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700'>
                  Lihat Semua Produk
                </Link>
              ) : (
                <Link
                  href={isLoggedIn ? '/dashboard' : '/register'}
                  className='inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700'
                >
                  {isLoggedIn ? 'Kelola Toko Saya' : 'Buka Toko Gratis'}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4'>
            {products.map((product: PublicProductWithStore, index: number) => (
              <Link
                href={`/${product.stores?.slug || ''}`}
                key={product.id}
                className='group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md active:scale-[0.99]'
              >
                {/* Foto Produk 1:1 */}
                <div className='relative aspect-square w-full overflow-hidden bg-slate-100'>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading={index < 4 ? 'eager' : 'lazy'}
                      decoding='async'
                      className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${!product.is_available ? 'opacity-55 grayscale' : ''}`}
                    />
                  ) : (
                    <div className='flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400'>
                      <ImageOff className='h-5 w-5' />
                      <span className='text-[11px]'>No Image</span>
                    </div>
                  )}

                  {/* Badge Status Stok */}
                  {!product.is_available ? (
                    <div className='absolute inset-0 flex items-center justify-center bg-slate-900/50'>
                      <span className='rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-xs'>Habis</span>
                    </div>
                  ) : (
                    <span className='absolute top-2 left-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs'>Tersedia</span>
                  )}
                </div>

                {/* Informasi Produk & Nama Toko */}
                <div className='flex flex-1 flex-col justify-between p-3 sm:p-3.5'>
                  <div>
                    <h3 className='line-clamp-2 text-xs font-bold leading-snug text-slate-900 group-hover:text-emerald-700 sm:text-sm'>{product.name}</h3>
                    <div className='mt-1.5 flex items-center gap-1 text-[11px] text-slate-500'>
                      <Store className='h-3 w-3 shrink-0 text-emerald-600' />
                      <span className='truncate font-medium'>{product.stores?.name || 'Toko UMKM'}</span>
                    </div>
                  </div>

                  <div className='mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2'>
                    <p className={`text-sm font-extrabold sm:text-base ${product.is_available ? 'text-emerald-700' : 'text-slate-400'}`}>Rp {product.price.toLocaleString('id-ID')}</p>
                    <span className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white'>
                      <ArrowUpRight className='h-4 w-4' />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer Global */}
      <PublicFooter />
    </div>
  );
}
