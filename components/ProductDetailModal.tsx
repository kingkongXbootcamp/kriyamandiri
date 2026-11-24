'use client';

import React, { useEffect } from 'react';
import { PublicProduct } from '@/lib/public-catalog';
import { formatRupiah } from '@/lib/cart-utils';

interface ProductDetailModalProps {
  product: PublicProduct | null;
  storeName: string;
  quantityInCart: number;
  onClose: () => void;
  onAddOneItem: (product: PublicProduct) => void;
  onDecreaseQty: (productId: string) => void;
}

export default function ProductDetailModal({ product, storeName, quantityInCart, onClose, onAddOneItem, onDecreaseQty }: ProductDetailModalProps) {
  // Tutup modal dengan tombol Escape & kunci scroll halaman belakang saat terbuka
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const isOutOfStock = !product.is_available;

  return (
    <div role='dialog' aria-modal='true' aria-labelledby='product-detail-title' className='fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/50 backdrop-blur-[1px] sm:p-4'>
      {/* Area klik backdrop untuk menutup modal */}
      <div className='flex-1 sm:hidden' onClick={onClose} />
      <div className='hidden sm:block fixed inset-0 -z-10' onClick={onClose} />

      {/* Kontainer Modal */}
      <div className='w-full max-w-lg mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden'>
        {/* Header Modal: Nama Toko & Tombol Tutup (X) */}
        <div className='px-4 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-white shrink-0'>
          <div className='min-w-0 flex items-center gap-2'>
            <span className='w-2 h-2 rounded-full bg-emerald-600 shrink-0' />
            <p className='text-xs font-bold text-gray-600 truncate'>{storeName}</p>
          </div>

          <button
            type='button'
            onClick={onClose}
            aria-label='Tutup detail produk'
            className='w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center transition shrink-0'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Konten Scrollable: Gambar Besar, Nama, Harga, & Deskripsi Lengkap */}
        <div className='flex-1 overflow-y-auto'>
          {/* Gambar Besar Produk */}
          <div className='relative w-full aspect-square max-h-80 sm:max-h-96 bg-gray-100 overflow-hidden'>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-55 grayscale' : ''}`} />
            ) : (
              <div className='w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1.5'>
                <svg className='w-10 h-10 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.6}
                    d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
                <span className='text-xs font-medium'>Foto Belum Tersedia</span>
              </div>
            )}

            {/* Badge Status Ketersediaan */}
            <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${isOutOfStock ? 'bg-gray-900/85 text-white' : 'bg-emerald-600/95 text-white'}`}>
              {isOutOfStock ? 'Stok Habis' : 'Tersedia'}
            </span>
          </div>

          {/* Informasi Utama Produk */}
          <div className='p-4 sm:p-5 space-y-3'>
            <div>
              <h2 id='product-detail-title' className='text-lg sm:text-xl font-extrabold text-gray-900 leading-snug'>
                {product.name}
              </h2>

              <p className={`text-xl font-extrabold mt-1.5 ${isOutOfStock ? 'text-gray-400' : 'text-emerald-700'}`}>{formatRupiah(product.price)}</p>
            </div>

            <div className='pt-3 border-t border-gray-100'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5'>Deskripsi Produk</h3>
              {product.description && product.description.trim().length > 0 ? (
                <p className='text-sm text-gray-700 leading-relaxed whitespace-pre-line'>{product.description}</p>
              ) : (
                <p className='text-xs text-gray-400 italic'>Tidak ada deskripsi tambahan untuk produk ini.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Aksi: Tombol + Keranjang / Kontrol Kuantitas */}
        <div className='p-4 border-t border-gray-200 bg-white shrink-0'>
          {isOutOfStock ? (
            <button type='button' disabled aria-disabled='true' className='w-full py-3.5 px-4 bg-gray-100 border border-gray-200 text-gray-400 text-sm font-bold rounded-2xl cursor-not-allowed'>
              Stok Habis
            </button>
          ) : quantityInCart === 0 ? (
            <button
              type='button'
              onClick={() => onAddOneItem(product)}
              className='w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-extrabold rounded-2xl shadow-sm transition flex items-center justify-center gap-2'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 4v16m8-8H4' />
              </svg>
              <span>Keranjang</span>
            </button>
          ) : (
            <div className='flex items-center gap-3'>
              <div className='flex-1 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-1.5'>
                <button
                  type='button'
                  onClick={() => onDecreaseQty(product.id)}
                  aria-label={`Kurangi jumlah ${product.name}`}
                  className='w-10 h-10 rounded-xl bg-white text-emerald-800 font-extrabold text-base shadow-xs hover:bg-emerald-100 transition flex items-center justify-center'
                >
                  −
                </button>
                <div className='text-center'>
                  <span className='block text-[10px] font-medium text-emerald-700'>Di Keranjang</span>
                  <span className='text-sm font-extrabold text-emerald-950'>{quantityInCart} barang</span>
                </div>
                <button
                  type='button'
                  onClick={() => onAddOneItem(product)}
                  aria-label={`Tambah jumlah ${product.name}`}
                  className='w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-base shadow-xs hover:bg-emerald-700 transition flex items-center justify-center'
                >
                  +
                </button>
              </div>

              <button type='button' onClick={onClose} className='py-3.5 px-5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-2xl transition shrink-0'>
                Selesai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
