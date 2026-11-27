import { BiteshipArea, BiteshipAreaResponse, BiteshipCourierResponse, BiteshipPricingItem, FetchBiteshipRatesParams, ShippingRate } from '@/types/shipping';

const BITESHIP_BASE_URL = 'https://api.biteship.com/v1';

const DEFAULT_COURIERS = 'jne,jnt,sicepat,anteraja,idexpress,ninja,pos,gosend,grab';

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

/**
 * Mencari daftar area Biteship (termasuk ID area) berdasarkan nama kecamatan, kota, atau kode pos.
 */
export async function searchBiteshipArea(query: string): Promise<BiteshipArea[]> {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 3) {
    return [];
  }

  const apiKey = getBiteshipApiKey();
  const url = `${BITESHIP_BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(cleanQuery)}&type=single`;

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
  } catch {
    throw new Error(`Respons pencarian area Biteship tidak valid (HTTP ${response.status}).`);
  }

  if (!response.ok || !data?.success) {
    const errorMessage = data?.error || data?.message || `Gagal mencari area pengiriman (HTTP ${response.status}).`;
    throw new Error(errorMessage);
  }

  return Array.isArray(data.areas) ? data.areas : [];
}

/**
 * Mengonversi teks lokasi (kecamatan/kota) atau ID area menjadi area_id valid Biteship.
 */
export async function searchBiteshipAreaId(locationQuery: string): Promise<string | null> {
  const cleanQuery = String(locationQuery || '').trim();
  if (!cleanQuery) {
    return null;
  }

  // Jika sudah berupa ID area Biteship (diawali "ID"), langsung kembalikan
  if (/^ID[A-Z0-9]+$/i.test(cleanQuery)) {
    return cleanQuery;
  }

  const areas = await searchBiteshipArea(cleanQuery);
  return areas.length > 0 && areas[0].id ? areas[0].id : null;
}

/**
 * Mengambil daftar tarif ongkir real-time dari Biteship berdasarkan ID area asal, ID area tujuan, berat (gram), dan kurir.
 */
export async function getBiteshipRates(originAreaId: string, destinationAreaId: string, weight: number, courier?: string): Promise<ShippingRate[]> {
  const cleanOriginId = String(originAreaId || '').trim();
  const cleanDestinationId = String(destinationAreaId || '').trim();

  if (!cleanOriginId || !cleanDestinationId) {
    throw new Error('originAreaId dan destinationAreaId wajib diisi.');
  }

  const safeWeightGrams = Math.max(1, Math.round(Number(weight) || 250));
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
  } catch {
    throw new Error(`Respons tarif kurir Biteship tidak valid (HTTP ${response.status}).`);
  }

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
 * Wrapper kompatibel untuk actions/shipping.ts yang menerima objek parameter.
 */
export async function fetchBiteshipShippingRates(params: FetchBiteshipRatesParams): Promise<ShippingRate[]> {
  return getBiteshipRates(params.originAreaId, params.destinationAreaId, params.weightGrams, params.courierCompany);
}
