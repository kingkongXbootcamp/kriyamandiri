'use client';

import React from 'react';
import { ShippingRate } from '@/types/shipping';
import { formatRupiah } from '@/lib/cart-utils';

export interface ShippingSelectorProps {
  shippingRates: ShippingRate[];
  selectedRate: ShippingRate | null;
  onSelectRate: (rate: ShippingRate) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function ShippingSelector({ shippingRates, selectedRate, onSelectRate, isLoading = false, error = null, onRetry }: ShippingSelectorProps) {
  if (isLoading) {
    return (
      <div aria-busy='true' aria-label='Memuat pilihan kurir' className='space-y-2.5'>
        <div className='flex items-center gap-2 text-xs font-semibold text-emerald-700'>
          <span className='w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin' />
          <span>Mengecek tarif ongkos kirim real-time...</span>
        </div>
        {[1, 2, 3].map((skeleton) => (
          <div key={skeleton} className='p-3.5 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse flex items-center justify-between gap-3'>
            <div className='space-y-2 flex-1'>
              <div className='h-3.5 w-32 bg-gray-200 rounded' />
              <div className='h-3 w-24 bg-gray-200 rounded' />
            </div>
            <div className='h-4 w-20 bg-gray-200 rounded' />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role='alert' className='p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2'>
        <p className='font-bold'>Gagal memuat ongkos kirim</p>
        <p className='leading-relaxed'>{error}</p>
        {onRetry && (
          <button type='button' onClick={onRetry} className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition'>
            Coba Cek Lagi
          </button>
        )}
      </div>
    );
  }

  if (shippingRates.length === 0) {
    return null;
  }

  return (
    <div role='radiogroup' aria-label='Pilih Layanan Kurir Pengiriman' className='space-y-2.5'>
      {shippingRates.map((rate) => {
        const rateKey = `${rate.courier}-${rate.service}`;
        const isSelected = selectedRate !== null && selectedRate.courier === rate.courier && selectedRate.service === rate.service;

        return (
          <button
            key={rateKey}
            type='button'
            role='radio'
            aria-checked={isSelected}
            onClick={() => onSelectRate(rate)}
            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 touch-manipulation ${
              isSelected ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 shadow-xs' : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50/70'
            }`}
          >
            {/* Indikator Radio + Info Kurir & Estimasi */}
            <div className='flex items-start gap-3 min-w-0 flex-1'>
              <span
                className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300 bg-white'}`}
              >
                {isSelected && <span className='w-1.5 h-1.5 rounded-full bg-white' />}
              </span>

              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-1.5 flex-wrap'>
                  <span className='text-xs sm:text-sm font-extrabold text-gray-900'>
                    {rate.courier_name} - {rate.service_name}
                  </span>
                </div>

                {rate.description && <p className='text-[11px] text-gray-500 line-clamp-1 mt-0.5'>{rate.description}</p>}

                <p className='text-[11px] font-medium text-gray-600 mt-1 flex items-center gap-1'>
                  <svg className='w-3.5 h-3.5 text-emerald-600 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                  <span>Estimasi: {rate.estimated_delivery}</span>
                </p>
              </div>
            </div>

            {/* Tarif Ongkos Kirim */}
            <div className='text-right shrink-0'>
              <span className={`text-xs sm:text-sm font-extrabold ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>{formatRupiah(rate.price)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
