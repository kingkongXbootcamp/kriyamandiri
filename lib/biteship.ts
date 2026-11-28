import { BiteshipArea, BiteshipAreaResponse, BiteshipCourierResponse, BiteshipPricingItem, FetchBiteshipRatesParams, ShippingRate } from '@/types/shipping';

const BITESHIP_BASE_URL = 'https://api.biteship.com/v1';

const DEFAULT_COURIERS = 'jne,jnt,sicepat,anteraja,idexpress,ninja,pos,gosend,grab';

/**
 * Validasi format area_id resmi Biteship (contoh: IDNP6IDNC145IDND823IDZ13720).
 * Mencegah nama area mentah seperti "Cibubur" dipakai langsung sebagai area_id.
 */
export function isValidBiteshipAreaId(value: string): boolean {
  const clean = String(value || '').trim();
  return /^ID[A-Z0-9]{6,}$/i.test(clean);
}

function getBiteshipApiKey(): string {
  const apiKey = process.env.BITESHIP_API_KEY!;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('BITESHIP_API_KEY belum diatur pada environment variable (.env.local / Vercel).');
  }
  return apiKey.trim();
}

function formatEstimatedDelivery(item: BiteshipPricingItem): string {
  if (item.duration && item.duration.trim().length > 0) {
    return item.duration.trim();
  }

  if (item.shipment_duration_range && item.shipment_duration_unit) {
    return `${item.shipment_duration_range} ${item.shipment_duration_unit}`.trim();
  }

  return 'Estimasi menyesuaikan kurir';
}

function mapPricingToShippingRate(item: BiteshipPricingItem): ShippingRate {
  return {
    courier: (item.company || '').toLowerCase().trim(),
    courier_name: item.courier_name || (item.company || '').toUpperCase(),
    service: (item.courier_service_code || item.type || '').toLowerCase().trim(),
    service_name: item.courier_service_name || (item.courier_service_code || '').toUpperCase(),
    description: item.description || '',
    price: Math.max(0, Math.round(Number(item.price) || 0)),
    estimated_delivery: formatEstimatedDelivery(item),
    currency: item.currency || 'IDR',
  };
}

async function queryBiteshipAreasEndpoint(cleanQuery: string, searchType: 'single' | 'double', apiKey: string): Promise<BiteshipArea[]> {
  const url = `${BITESHIP_BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(cleanQuery)}&type=${searchType}`;

  console.log('[BITESHIP_AREA_SEARCH] Request:', {
    query: cleanQuery,
    type: searchType,
    url,
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });

  let data: BiteshipAreaResponse | null = null;
  try {
    data = (await response.json()) as BiteshipAreaResponse;
  } catch (parseErr) {
    console.error('[BITESHIP_AREA_ERROR] Respons JSON tidak valid:', {
      query: cleanQuery,
      type: searchType,
      httpStatus: response.status,
      parseErr,
    });
    throw new Error(`Respons pencarian area Biteship tidak valid (HTTP ${response.status}).`);
  }

  console.log('[BITESHIP_AREA_RESPONSE]', {
    query: cleanQuery,
    type: searchType,
    httpStatus: response.status,
    success: data?.success,
    totalAreas: Array.isArray(data?.areas) ? data.areas.length : 0,
    firstArea: data?.areas?.[0]
      ? {
          id: data.areas[0].id,
          name: data.areas[0].name,
          district: data.areas[0].administrative_division_level_3_name,
          city: data.areas[0].administrative_division_level_2_name,
          province: data.areas[0].administrative_division_level_1_name,
          postal_code: data.areas[0].postal_code,
        }
      : null,
    error: data?.error || data?.message || null,
  });

  if (!response.ok || !data?.success) {
    const errorMessage = data?.error || data?.message || `Gagal mencari area pengiriman di Biteship (HTTP ${response.status}).`;
    console.error('[BITESHIP_AREA_API_FAILED]', {
      query: cleanQuery,
      type: searchType,
      httpStatus: response.status,
      code: data?.code,
      errorMessage,
    });
    throw new Error(errorMessage);
  }

  return Array.isArray(data.areas) ? data.areas : [];
}

/**
 * Mencari daftar area Biteship (termasuk area_id) berdasarkan nama kelurahan, kecamatan, kota, atau kode pos.
 * Menggunakan type=single lalu fallback otomatis ke type=double agar nama kelurahan seperti "Cibubur" tetap ditemukan.
 */
export async function searchBiteshipArea(query: string): Promise<BiteshipArea[]> {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 3) {
    return [];
  }

  const apiKey = getBiteshipApiKey();

  // 1. Pencarian utama (type=single)
  const singleResults = await queryBiteshipAreasEndpoint(cleanQuery, 'single', apiKey);
  if (singleResults.length > 0) {
    return singleResults;
  }

  // 2. Fallback pencarian hierarki kelurahan/kode pos (type=double)
  const doubleResults = await queryBiteshipAreasEndpoint(cleanQuery, 'double', apiKey);
  return doubleResults;
}

/**
 * Mengonversi teks lokasi menjadi area_id valid Biteship.
 */
export async function searchBiteshipAreaId(locationQuery: string): Promise<string | null> {
  const cleanQuery = String(locationQuery || '').trim();
  if (!cleanQuery) {
    return null;
  }

  if (isValidBiteshipAreaId(cleanQuery)) {
    return cleanQuery;
  }

  const areas = await searchBiteshipArea(cleanQuery);
  const validArea = areas.find((a) => isValidBiteshipAreaId(a.id));
  return validArea ? validArea.id : null;
}

/**
 * Mengambil daftar tarif ongkir real-time dari Biteship berdasarkan originAreaId, destinationAreaId, dan weightGrams.
 */
export async function getBiteshipRates(originAreaId: string, destinationAreaId: string, weightGrams: number = 250, courier?: string): Promise<ShippingRate[]> {
  const cleanOriginId = String(originAreaId || '').trim();
  const cleanDestinationId = String(destinationAreaId || '').trim();

  if (!isValidBiteshipAreaId(cleanOriginId)) {
    throw new Error(`originAreaId tidak valid ("${cleanOriginId}"). Wajib menggunakan area_id Biteship, bukan nama lokasi.`);
  }

  if (!isValidBiteshipAreaId(cleanDestinationId)) {
    throw new Error(`destinationAreaId tidak valid ("${cleanDestinationId}"). Wajib menggunakan area_id Biteship, bukan nama lokasi.`);
  }

  const safeWeightGrams = Math.max(1, Math.round(Number(weightGrams) || 250));
  const selectedCouriers = courier && courier.trim().length > 0 ? courier.toLowerCase().trim() : DEFAULT_COURIERS;

  const apiKey = getBiteshipApiKey();

  const payload = {
    origin_area_id: cleanOriginId,
    destination_area_id: cleanDestinationId,
    couriers: selectedCouriers,
    items: [
      {
        name: 'Paket Pesanan KRIYAMANDIRI',
        description: 'Produk UMKM',
        value: 10000,
        length: 15,
        width: 15,
        height: 10,
        weight: safeWeightGrams,
        quantity: 1,
      },
    ],
  };

  console.log('[BITESHIP_RATES_REQUEST]', {
    originAreaId: cleanOriginId,
    destinationAreaId: cleanDestinationId,
    weightGrams: safeWeightGrams,
    couriers: selectedCouriers,
  });

  const response = await fetch(`${BITESHIP_BASE_URL}/rates/couriers`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  let data: BiteshipCourierResponse | null = null;
  try {
    data = (await response.json()) as BiteshipCourierResponse;
  } catch (parseErr) {
    console.error('[BITESHIP_RATES_ERROR] Respons JSON tidak valid:', {
      httpStatus: response.status,
      parseErr,
    });
    throw new Error(`Respons tarif kurir Biteship tidak valid (HTTP ${response.status}).`);
  }

  console.log('[BITESHIP_RATES_RESPONSE]', {
    httpStatus: response.status,
    success: data?.success,
    totalPricing: Array.isArray(data?.pricing) ? data.pricing.length : 0,
    error: data?.error || data?.message || null,
  });

  if (!response.ok || !data?.success) {
    const errorMessage = data?.error || data?.message || `Gagal mengambil tarif ongkir Biteship (HTTP ${response.status}).`;
    console.error('[BITESHIP_RATES_API_FAILED]', {
      originAreaId: cleanOriginId,
      destinationAreaId: cleanDestinationId,
      weightGrams: safeWeightGrams,
      httpStatus: response.status,
      code: data?.code,
      errorMessage,
    });
    throw new Error(errorMessage);
  }

  if (!Array.isArray(data.pricing) || data.pricing.length === 0) {
    return [];
  }

  return data.pricing
    .filter((item) => Number.isFinite(Number(item.price)) && Number(item.price) >= 0)
    .map(mapPricingToShippingRate)
    .sort((a, b) => a.price - b.price);
}

/**
 * Wrapper kompatibel untuk pemanggilan berbasis objek parameter.
 */
export async function fetchBiteshipShippingRates(params: FetchBiteshipRatesParams): Promise<ShippingRate[]> {
  return getBiteshipRates(params.originAreaId, params.destinationAreaId, params.weightGrams, params.courierCompany);
}
