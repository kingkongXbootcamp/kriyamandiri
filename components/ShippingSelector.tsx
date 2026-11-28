'use client';

import React, { useMemo } from 'react';
import { ShippingErrorStage, ShippingRate } from '@/types/shipping';
import { formatRupiah } from '@/lib/cart-utils';

export interface ShippingSelectorProps {
  shippingRates: ShippingRate[];
  selectedRate: ShippingRate | null;
  onSelectRate: (rate: ShippingRate) => void;
  isLoading?: boolean;
  error?: string | null;
  errorStage?: ShippingErrorStage | null;
  onRetry?: () => void;
}

const INSTANT_COURIER_CODES = new Set(['gojek', 'grab', 'lalamove', 'borzo', 'maxim', 'rara', 'deliveree', 'dash_electric']);

function isInstantRate(rate: ShippingRate): boolean {
  if (rate.shipping_type === 'instant') return true;
  if (rate.shipping_type === 'regular') return false;

  const courier = (rate.courier || '').toLowerCase().trim();
  const service = (rate.service || '').toLowerCase().trim();
  const serviceName = (rate.service_name || '').toLowerCase();

  return INSTANT_COURIER_CODES.has(courier) || service.includes('instant') || service.includes('same_day') || serviceName.includes('instant') || serviceName.includes('same day');
}

function getErrorHeading(stage?: ShippingErrorStage | null): string {
  switch (stage) {
    case 'origin':
      return 'Alamat Asal Toko Tidak Ditemukan';
    case 'destination':
      return 'Alamat Tujuan Pengiriman Tidak Ditemukan';
    case 'rates':
      return 'Gagal Menghitung Ongkos Kirim';
    default:
      return 'Gagal Memuat Ongkos Kirim';
  }
}

export default function ShippingSelector({ shippingRates, selectedRate, onSelectRate, isLoading = false, error = null, errorStage = null, onRetry }: ShippingSelectorProps) {
  const { instantRates, regularRates } = useMemo(() => {
    const instant: ShippingRate[] = [];
    const regular: ShippingRate[] = [];

    for (const rate of shippingRates) {
      if (isInstantRate(rate)) {
        instant.push(rate);
      } else {
        regular.push(rate);
      }
    }

    return { instantRates: instant, regularRates: regular };
  }, [shippingRates]);

  if (isLoading) {
    return (
      <div aria-busy='true' aria-label='Memuat pilihan kurir' className='space-y-2.5'>
        <div className='flex items-center gap-2 text-xs font-semibold text-emerald-700'>
          <span className='w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin' />
          <span>Mengecek tarif kurir instan & reguler real-time...</span>
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
        <p className='font-bold'>{getErrorHeading(errorStage)}</p>
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

  const renderRateCard = (rate: ShippingRate, instant: boolean) => {
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
          <span className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300 bg-white'}`}>
            {isSelected && <span className='w-1.5 h-1.5 rounded-full bg-white' />}
          </span>

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-1.5 flex-wrap'>
              <span className='text-xs sm:text-sm font-extrabold text-gray-900'>
                {rate.courier_name} - {rate.service_name}
              </span>

              {instant ? (
                <span className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200'>
                  <svg className='w-2.5 h-2.5 text-amber-600' fill='currentColor' viewBox='0 0 20 20'>
                    <path d='M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z' />
                  </svg>
                  <span>Instan</span>
                </span>
              ) : (
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200'>
                  <span>Reguler</span>
                </span>
              )}
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
  };

  return (
    <div role='radiogroup' aria-label='Pilih Layanan Kurir Pengiriman' className='space-y-4'>
      {/* KATEGORI 1: KURIR INSTAN (Direkomendasikan untuk Makanan) */}
      {instantRates.length > 0 && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between px-0.5'>
            <div className='flex items-center gap-1.5'>
              <span className='w-5 h-5 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center'>
                <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
                  <path d='M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z' />
                </svg>
              </span>
              <h3 className='text-xs font-extrabold uppercase tracking-wide text-gray-800'>Instan (Sampai Hari Ini)</h3>
            </div>
            <span className='text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'>Cocok untuk Makanan</span>
          </div>

          <div className='space-y-2'>{instantRates.map((rate) => renderRateCard(rate, true))}</div>
        </div>
      )}

      {/* KATEGORI 2: KURIR REGULER */}
      {regularRates.length > 0 && (
        <div className='space-y-2'>
          <div className='flex items-center gap-1.5 px-0.5'>
            <span className='w-5 h-5 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center'>
              <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' />
              </svg>
            </span>
            <h3 className='text-xs font-extrabold uppercase tracking-wide text-gray-800'>Reguler (Ekspedisi)</h3>
          </div>

          <div className='space-y-2'>{regularRates.map((rate) => renderRateCard(rate, false))}</div>
        </div>
      )}
    </div>
  );
}
