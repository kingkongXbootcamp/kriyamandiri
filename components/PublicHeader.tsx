import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';

export default function PublicHeader() {
  return (
    <header className='w-full border-b border-slate-200 bg-white sticky top-0 z-50'>
      <div className='mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6'>
        {/* Logo & Nama Aplikasi (Link ke Halaman Depan) */}
        <Link href='/' className='flex items-center gap-2 hover:opacity-80 transition'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white'>
            <Store className='h-4 w-4' />
          </div>
          <span className='text-base font-bold tracking-tight text-slate-900'>KRIYAMANDIRI</span>
        </Link>

        {/* Tombol Kembali ke Direktori Toko */}
        <Link href='/' className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition'>
          <ArrowLeft className='h-4 w-4' />
          <span>Beranda</span>
        </Link>
      </div>
    </header>
  );
}
