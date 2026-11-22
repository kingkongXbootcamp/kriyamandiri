import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUserStore } from '@/actions/store';
import StoreProfileForm from '@/components/StoreProfileForm';
import DeleteStoreSection from '@/components/DeleteStoreSection';

export const metadata = {
  title: 'Profil Toko | KRIYAMANDIRI',
  description: 'Atur nama toko, tautan katalog, dan nomor WhatsApp penerima pesanan.',
};

export const dynamic = 'force-dynamic';

export default async function StoreProfilePage() {
  const existingStore = await getCurrentUserStore();

  return (
    <div className='space-y-6'>
      {/* Tombol Kembali ke Dashboard */}
      <div className='mx-auto flex max-w-2xl items-center justify-between'>
        <Link href='/dashboard' className='inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-slate-900'>
          <ArrowLeft className='h-4 w-4' />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Form Pendaftaran / Edit Profil Toko */}
      <StoreProfileForm initialData={existingStore} />

      {/* Zona Berbahaya: Hapus Toko (Terpisah dari Form Simpan) */}
      {existingStore && <DeleteStoreSection storeId={existingStore.id} storeName={existingStore.name} />}
    </div>
  );
}
