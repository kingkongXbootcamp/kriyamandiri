'use server';

import { fetchBiteshipShippingRates, searchBiteshipAreaId } from '@/lib/biteship';
import { GetShippingRatesResult } from '@/types/shipping';

export async function getShippingRates(originAreaId: string, destinationAreaId: string, weightGrams: number, courierCompany?: string): Promise<GetShippingRatesResult> {
  const cleanOriginInput = String(originAreaId || '').trim();
  const cleanDestinationInput = String(destinationAreaId || '').trim();

  if (!cleanOriginInput || !cleanDestinationInput) {
    return {
      success: false,
      rates: [],
      error: 'Area asal toko dan area tujuan pengiriman wajib diisi.',
    };
  }

  const numericWeight = Number(weightGrams);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    return {
      success: false,
      rates: [],
      error: 'Berat total paket harus lebih dari 0 gram.',
    };
  }

  try {
    // Pastikan origin & destination berupa area_id valid Biteship
    const [resolvedOriginId, resolvedDestinationId] = await Promise.all([searchBiteshipAreaId(cleanOriginInput), searchBiteshipAreaId(cleanDestinationInput)]);

    if (!resolvedOriginId) {
      return {
        success: false,
        rates: [],
        error: `Area asal pengiriman toko ("${cleanOriginInput}") tidak dikenali oleh sistem kurir.`,
      };
    }

    if (!resolvedDestinationId) {
      return {
        success: false,
        rates: [],
        error: `Kecamatan/Kota tujuan ("${cleanDestinationInput}") tidak ditemukan. Periksa kembali penulisan kecamatan dan kota Anda.`,
      };
    }

    const rates = await fetchBiteshipShippingRates({
      originAreaId: resolvedOriginId,
      destinationAreaId: resolvedDestinationId,
      weightGrams: numericWeight,
      courierCompany,
    });

    if (rates.length === 0) {
      return {
        success: true,
        rates: [],
        resolvedOriginAreaId: resolvedOriginId,
        resolvedDestinationAreaId: resolvedDestinationId,
        error: 'Tidak ada layanan kurir yang tersedia untuk rute pengiriman ini.',
      };
    }

    return {
      success: true,
      rates,
      resolvedOriginAreaId: resolvedOriginId,
      resolvedDestinationAreaId: resolvedDestinationId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghubungi layanan cek ongkir.';

    console.error('[BITESHIP_RATES_ERROR]', {
      originInput: cleanOriginInput,
      destinationInput: cleanDestinationInput,
      weightGrams: numericWeight,
      courierCompany: courierCompany || 'default',
      message,
    });

    return {
      success: false,
      rates: [],
      error: message,
    };
  }
}
