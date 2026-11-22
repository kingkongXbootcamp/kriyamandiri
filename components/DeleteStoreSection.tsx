'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { deleteStore } from '@/actions/store';

interface DeleteStoreSectionProps {
  storeId: string;
  storeName: string;
}

export default function DeleteStoreSection({ storeId, storeName }: DeleteStoreSectionProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenModal = () => {
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (deleting) return;
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setErrorMessage('');
    setDeleting(true);

    try {
      await deleteStore(storeId);
      setIsModalOpen(false);
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus toko.';
      setErrorMessage(msg);
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Kartu Zona Berbahaya - Terpisah dari Form Simpan Profil */}
      <section aria-label='Zona Berbahaya' className='mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs sm:p-6'>
        <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          <div className='space-y-1'>
            <h2 className='text-sm font-extrabold text-rose-900 sm:text-base'>Hapus Toko Permanen</h2>
            <p className='text-xs leading-relaxed text-rose-700'>
              Menghapus toko <strong>{storeName}</strong> akan menghapus seluruh data katalog, tautan toko, dan semua produk di dalamnya secara permanen.
            </p>
          </div>

          <button
            type='button'
            onClick={handleOpenModal}
            className='inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98] sm:text-sm'
          >
            <Trash2 className='h-4 w-4' />
            <span>Hapus Toko</span>
          </button>
        </div>
      </section>

      {/* Modal Dialog Konfirmasi Hapus Toko */}
      {isModalOpen && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='delete-store-modal-title'
          className='fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-[1px] sm:items-center'
        >
          <div className='w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600'>
                  <AlertTriangle className='h-6 w-6' />
                </div>
                <div>
                  <h3 id='delete-store-modal-title' className='text-base font-extrabold text-slate-900'>
                    Konfirmasi Hapus Toko
                  </h3>
                  <p className='text-xs text-slate-500'>Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              <button
                type='button'
                disabled={deleting}
                onClick={handleCloseModal}
                aria-label='Tutup dialog'
                className='flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs leading-relaxed text-rose-900'>
              Apakah Anda yakin ingin menghapus toko <strong>{storeName}</strong>? Semua produk dan tautan katalog publik toko ini akan langsung hilang dan tidak bisa diakses lagi oleh pembeli.
            </div>

            {errorMessage && (
              <div role='alert' className='rounded-xl border border-rose-300 bg-rose-100/70 p-3 text-xs font-semibold text-rose-800'>
                {errorMessage}
              </div>
            )}

            <div className='grid grid-cols-2 gap-2.5 pt-1'>
              <button
                type='button'
                disabled={deleting}
                onClick={handleCloseModal}
                className='min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm'
              >
                Batal
              </button>
              <button
                type='button'
                disabled={deleting}
                onClick={handleConfirmDelete}
                className='flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 sm:text-sm'
              >
                {deleting ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className='h-4 w-4' />
                    <span>Ya, Hapus Toko</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
