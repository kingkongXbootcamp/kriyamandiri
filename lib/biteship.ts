import { BiteshipArea, BiteshipAreaResponse, BiteshipCourierResponse, BiteshipPricingItem, Coordinates, FetchBiteshipRatesParams, ShippingRate } from '@/types/shipping';

const BITESHIP_BASE_URL = 'https://api.biteship.com/v1';

export const REGULAR_COURIERS = 'jne,jnt,sicepat,anteraja,idexpress,ninja,pos';

// Kode kurir instan resmi di API Biteship (GoSend = gojek, GrabExpress = grab)
export const INSTANT_COURIERS = 'gojek,grab,lalamove,borzo';

export const DEFAULT_COURIERS = `${REGULAR_COURIERS},${INSTANT_COURIERS}`;

const INSTANT_COMPANY_SET = new Set(['gojek', 'grab', 'lalamove', 'borzo', 'maxim', 'rara', 'deliveree', 'dash_electric']);

const INSTANT_SERVICE_SET = new Set(['instant', 'instant_car', 'instant_bike', 'same_day', 'sds', 'q9_same_day', 'motorcycle']);

/**
 * Validasi format area_id resmi Biteship (contoh: IDNP6IDNC145IDND823IDZ13720).
 */
export function isValidBiteshipAreaId(value: string): boolean {
  const clean = String(value || '').trim();
  return /^ID[A-Z0-9]{6,}$/i.test(clean);
}

/**
 * Validasi titik koordinat geografis Indonesia yang sah.
 */
export function isValidCoordinates(coords?: Coordinates | null): coords is Coordinates {
  if (!coords) return false;
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 && lat >= -12 && lat <= 7 && lng >= 94 && lng <= 142;
}

function getBiteshipApiKey(): string {
  const apiKey = process.env.BITESHIP_API_KEY!;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('BITESHIP_API_KEY belum diatur pada environment variable (.env.local / Vercel).');
  }
  return apiKey.trim();
}

function classifyShippingType(item: BiteshipPricingItem): 'instant' | 'regular' {
  const company = (item.company || '').toLowerCase().trim();
  const serviceCode = (item.courier_service_code || item.type || '').toLowerCase().trim();
  const serviceName = (item.courier_service_name || '').toLowerCase();

  if (INSTANT_COMPANY_SET.has(company) || INSTANT_SERVICE_SET.has(serviceCode) || serviceName.includes('instant') || serviceName.includes('same day') || serviceName.includes('sameday')) {
    return 'instant';
  }

  return 'regular';
}

function formatEstimatedDelivery(item: BiteshipPricingItem): string {
  if (item.duration && item.duration.trim().length > 0) {
    return item.duration.trim();
  }

  if (item.shipment_duration_range && item.shipment_duration_unit) {
    return `${item.shipment_duration_range} ${item.shipment_duration_unit}`.trim();
  }

  return classifyShippingType(item) === 'instant' ? '1 - 3 jam (Hari yang sama)' : 'Estimasi menyesuaikan kurir';
}

function mapPricingToShippingRate(item: BiteshipPricingItem): ShippingRate {
  const shippingType = classifyShippingType(item);

  return {
    courier: (item.company || '').toLowerCase().trim(),
    courier_name: item.courier_name || (item.company || '').toUpperCase(),
    service: (item.courier_service_code || item.type || '').toLowerCase().trim(),
    service_name: item.courier_service_name || (item.courier_service_code || '').toUpperCase(),
    description: item.description || '',
    price: Math.max(0, Math.round(Number(item.price) || 0)),
    estimated_delivery: formatEstimatedDelivery(item),
    currency: item.currency || 'IDR',
    shipping_type: shippingType,
  };
}

/**
 * Geocoding alamat teks menjadi titik koordinat (latitude & longitude) untuk kebutuhan kurir instan.
 */
export async function geocodeAddressToCoordinates(addressQuery: string): Promise<Coordinates | null> {
  const cleanQuery = String(addressQuery || '').trim();
  if (cleanQuery.length < 3) {
    return null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=id&limit=1&q=${encodeURIComponent(cleanQuery)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'KriyamandiriUMKM/1.0 (https://kriyamandiri.vercel.app)',
        Accept: 'application/json',
      },
      cache: 'force-cache',
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);

    if (isValidCoordinates({ latitude: lat, longitude: lng })) {
      return { latitude: lat, longitude: lng };
    }

    return null;
  } catch (err) {
    console.warn('[GEOCODE_FALLBACK_WARN] Gagal melakukan geocoding alamat:', {
      query: cleanQuery,
      err,
    });
    return null;
  }
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
 */
export async function searchBiteshipArea(query: string): Promise<BiteshipArea[]> {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 3) {
    return [];
  }

  const apiKey = getBiteshipApiKey();

  const singleResults = await queryBiteshipAreasEndpoint(cleanQuery, 'single', apiKey);
  if (singleResults.length > 0) {
    return singleResults;
  }

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

async function sendRatesRequest(payload: Record<string, unknown>, apiKey: string): Promise<ShippingRate[]> {
  console.log('[BITESHIP_RATES_REQUEST]', payload);

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
 * Mengambil daftar tarif ongkir reguler & instan dari Biteship.
 * Mengirimkan origin_latitude, origin_longitude, destination_latitude, dan destination_longitude
 * ketika tersedia untuk mengaktifkan tarif kurir instan (GoSend, GrabExpress, Lalamove, Borzo).
 */
export async function getBiteshipRates(
  originAreaId: string,
  destinationAreaId: string,
  weightGrams: number = 250,
  courier?: string,
  originCoordinates?: Coordinates | null,
  destinationCoordinates?: Coordinates | null,
): Promise<ShippingRate[]> {
  const cleanOriginId = String(originAreaId || '').trim();
  const cleanDestinationId = String(destinationAreaId || '').trim();

  if (!isValidBiteshipAreaId(cleanOriginId)) {
    throw new Error(`originAreaId tidak valid ("${cleanOriginId}"). Wajib menggunakan area_id Biteship, bukan nama lokasi.`);
  }

  if (!isValidBiteshipAreaId(cleanDestinationId)) {
    throw new Error(`destinationAreaId tidak valid ("${cleanDestinationId}"). Wajib menggunakan area_id Biteship, bukan nama lokasi.`);
  }

  const safeWeightGrams = Math.max(1, Math.round(Number(weightGrams) || 250));
  const hasBothCoordinates = isValidCoordinates(originCoordinates) && isValidCoordinates(destinationCoordinates);

  // Gunakan kurir reguler + instan jika koordinat tersedia, atau reguler saja jika koordinat tidak ada
  const selectedCouriers = courier && courier.trim().length > 0 ? courier.toLowerCase().trim() : hasBothCoordinates ? DEFAULT_COURIERS : REGULAR_COURIERS;

  const apiKey = getBiteshipApiKey();

  const baseItems = [
    {
      name: 'Paket Pesanan Makanan UMKM',
      description: 'Pesanan KRIYAMANDIRI',
      category: 'food_and_drink',
      value: 25000,
      length: 20,
      width: 20,
      height: 12,
      weight: safeWeightGrams,
      quantity: 1,
    },
  ];

  const payload: Record<string, unknown> = {
    origin_area_id: cleanOriginId,
    destination_area_id: cleanDestinationId,
    couriers: selectedCouriers,
    items: baseItems,
  };

  if (hasBothCoordinates && originCoordinates && destinationCoordinates) {
    payload.origin_latitude = Number(originCoordinates.latitude);
    payload.origin_longitude = Number(originCoordinates.longitude);
    payload.destination_latitude = Number(destinationCoordinates.latitude);
    payload.destination_longitude = Number(destinationCoordinates.longitude);
  }

  try {
    return await sendRatesRequest(payload, apiKey);
  } catch (primaryErr) {
    // Jika gabungan kurir instan + reguler ditolak (misal jarak di luar cakupan kurir instan),
    // lakukan fallback otomatis ke kurir reguler agar pembeli luar kota tetap bisa checkout
    if (hasBothCoordinates && !courier) {
      console.warn('[BITESHIP_INSTANT_FALLBACK] Mencoba ulang khusus kurir reguler:', primaryErr);
      return await sendRatesRequest(
        {
          origin_area_id: cleanOriginId,
          destination_area_id: cleanDestinationId,
          couriers: REGULAR_COURIERS,
          items: baseItems,
        },
        apiKey,
      );
    }

    throw primaryErr;
  }
}

/**
 * Wrapper kompatibel untuk pemanggilan berbasis objek parameter.
 */
export async function fetchBiteshipShippingRates(params: FetchBiteshipRatesParams): Promise<ShippingRate[]> {
  return getBiteshipRates(params.originAreaId, params.destinationAreaId, params.weightGrams, params.courierCompany, params.originCoordinates, params.destinationCoordinates);
}
