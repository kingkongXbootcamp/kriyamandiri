'use server';

import { getBiteshipRates, isValidBiteshipAreaId, searchBiteshipArea } from '@/lib/biteship';
import { BiteshipArea, GetShippingRatesOptions, GetShippingRatesResult, SearchAreaResult } from '@/types/shipping';

const PROVINCE_ABBREVIATIONS: Record<string, string> = {
  dki: 'DKI Jakarta',
  'dki jakarta': 'DKI Jakarta',
  jabar: 'Jawa Barat',
  jateng: 'Jawa Tengah',
  jatim: 'Jawa Timur',
  diy: 'DI Yogyakarta',
  jogja: 'DI Yogyakarta',
  sumut: 'Sumatera Utara',
  sumbar: 'Sumatera Barat',
  sumsel: 'Sumatera Selatan',
  kaltim: 'Kalimantan Timur',
  kalsel: 'Kalimantan Selatan',
  kalbar: 'Kalimantan Barat',
  sulsel: 'Sulawesi Selatan',
  sulut: 'Sulawesi Utara',
  ntb: 'Nusa Tenggara Barat',
  ntt: 'Nusa Tenggara Timur',
};

// Pengayaan alamat khusus untuk nama kelurahan/kawasan populer yang sering ditulis singkat oleh penjual
const KNOWN_SUBAREA_EXPANSIONS: Record<string, string[]> = {
  cibubur: ['Cibubur, Ciracas, Jakarta Timur, DKI Jakarta', 'Cibubur, Jakarta Timur', '13720', 'Cibubur'],
};

function normalizeLocationText(raw: string): string {
  const cleaned = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  return cleaned
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      const lower = trimmed.toLowerCase();
      return PROVINCE_ABBREVIATIONS[lower] || trimmed;
    })
    .filter(Boolean)
    .join(', ');
}

function buildCandidateQueries(primaryQuery: string, fallbackQueries: string[] = []): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (q: string) => {
    const normalized = normalizeLocationText(q);
    if (normalized.length >= 3 && !seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      candidates.push(normalized);
    }
  };

  const normalizedPrimary = normalizeLocationText(primaryQuery);
  const lowerPrimary = normalizedPrimary.toLowerCase();

  // Jika input persis nama kawasan singkat seperti "Cibubur", dahulukan alamat lengkapnya
  if (KNOWN_SUBAREA_EXPANSIONS[lowerPrimary]) {
    for (const expanded of KNOWN_SUBAREA_EXPANSIONS[lowerPrimary]) {
      pushUnique(expanded);
    }
  }

  pushUnique(normalizedPrimary);

  for (const fb of fallbackQueries) {
    const lowerFb = normalizeLocationText(fb).toLowerCase();
    if (KNOWN_SUBAREA_EXPANSIONS[lowerFb]) {
      for (const expanded of KNOWN_SUBAREA_EXPANSIONS[lowerFb]) {
        pushUnique(expanded);
      }
    }
    pushUnique(fb);
  }

  return candidates;
}

function selectBestMatchingArea(areas: BiteshipArea[], hints?: { city?: string; province?: string }): BiteshipArea | null {
  const validAreas = areas.filter((area) => isValidBiteshipAreaId(area.id));
  if (validAreas.length === 0) {
    return null;
  }

  if (!hints?.city && !hints?.province) {
    return validAreas[0];
  }

  const cityHint = normalizeLocationText(hints.city || '').toLowerCase();
  const provinceHint = normalizeLocationText(hints.province || '').toLowerCase();

  let bestArea = validAreas[0];
  let bestScore = -1;

  for (const area of validAreas) {
    let score = 0;
    const areaCity = (area.administrative_division_level_2_name || '').toLowerCase();
    const areaProvince = (area.administrative_division_level_1_name || '').toLowerCase();
    const areaFullName = (area.name || '').toLowerCase();

    if (cityHint && (areaCity.includes(cityHint) || areaFullName.includes(cityHint))) {
      score += 10;
    }

    if (provinceHint && (areaProvince.includes(provinceHint) || areaFullName.includes(provinceHint))) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestArea = area;
    }
  }

  return bestArea;
}

/**
 * Mengubah teks alamat (kelurahan, kecamatan, kota, atau kode pos) menjadi area_id sah Biteship.
 * Tidak pernah mengembalikan nama lokasi mentah sebagai pengganti area_id.
 */
export async function searchArea(query: string, fallbackQueries: string[] = [], locationHints?: { city?: string; province?: string }): Promise<SearchAreaResult> {
  const cleanQuery = String(query || '').trim();

  if (cleanQuery.length < 3) {
    return {
      success: false,
      areaId: null,
      areas: [],
      error: 'Masukkan minimal 3 karakter nama kecamatan, kota, atau kode pos.',
    };
  }

  // Jika sudah berupa area_id Biteship valid (misal dari database stores.origin_area_id)
  if (isValidBiteshipAreaId(cleanQuery)) {
    console.log('[BITESHIP_SEARCH_AREA] Menggunakan area_id tersimpan:', {
      areaId: cleanQuery,
    });
    return {
      success: true,
      areaId: cleanQuery,
      areas: [],
    };
  }

  const candidateQueries = buildCandidateQueries(cleanQuery, fallbackQueries);
  console.log('[BITESHIP_SEARCH_AREA] Kandidat query pencarian:', {
    originalQuery: cleanQuery,
    candidateQueries,
    locationHints: locationHints || null,
  });

  let lastApiError: string | null = null;

  for (const candidate of candidateQueries) {
    try {
      const areas = await searchBiteshipArea(candidate);
      const bestMatch = selectBestMatchingArea(areas, locationHints);

      if (bestMatch && isValidBiteshipAreaId(bestMatch.id)) {
        console.log('[BITESHIP_SEARCH_AREA] Area berhasil ditemukan:', {
          matchedQuery: candidate,
          areaId: bestMatch.id,
          areaName: bestMatch.name,
        });

        return {
          success: true,
          areaId: bestMatch.id,
          matchedArea: bestMatch,
          areas,
        };
      }
    } catch (err: unknown) {
      lastApiError = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghubungi API pencarian area Biteship.';
      console.error('[BITESHIP_SEARCH_AREA_ERROR] Gagal pada kandidat query:', {
        candidate,
        error: lastApiError,
      });
    }
  }

  if (lastApiError) {
    return {
      success: false,
      areaId: null,
      areas: [],
      error: `Gagal mencari area "${cleanQuery}" di API Biteship: ${lastApiError}`,
    };
  }

  return {
    success: false,
    areaId: null,
    areas: [],
    error: `Area "${cleanQuery}" tidak ditemukan di sistem pengiriman.`,
  };
}

/**
 * Mengambil daftar tarif ongkir real-time dari Biteship.
 * Memvalidasi & me-resolve originAreaId dan destinationAreaId terlebih dahulu, lalu memanggil getBiteshipRates.
 */
export async function getShippingRates(
  originAreaId: string,
  destinationAreaId: string,
  weightGrams: number = 250,
  courierCompany?: string,
  options?: GetShippingRatesOptions,
): Promise<GetShippingRatesResult> {
  const cleanOriginInput = String(originAreaId || '').trim();
  const cleanDestinationInput = String(destinationAreaId || '').trim();

  if (!cleanOriginInput) {
    return {
      success: false,
      rates: [],
      errorStage: 'origin',
      error: 'Alamat asal toko belum diatur oleh penjual.',
    };
  }

  if (!cleanDestinationInput) {
    return {
      success: false,
      rates: [],
      errorStage: 'destination',
      error: 'Kecamatan dan kota tujuan pengiriman wajib diisi.',
    };
  }

  const safeWeightGrams = Math.max(1, Math.round(Number(weightGrams) || 250));

  // 1. Resolve Origin area_id (Alamat Asal Toko)
  const originRes = isValidBiteshipAreaId(cleanOriginInput)
    ? { success: true, areaId: cleanOriginInput, areas: [] as BiteshipArea[] }
    : await searchArea(cleanOriginInput, options?.originFallbackQueries || []);

  if (!originRes.success || !originRes.areaId || !isValidBiteshipAreaId(originRes.areaId)) {
    console.error('[BITESHIP_SHIPPING_ORIGIN_ERROR]', {
      originInput: cleanOriginInput,
      originFallbackQueries: options?.originFallbackQueries || [],
      error: originRes.error,
    });

    return {
      success: false,
      rates: [],
      errorStage: 'origin',
      error: originRes.error || `Alamat asal toko ("${cleanOriginInput}") tidak ditemukan di sistem pengiriman.`,
    };
  }

  // 2. Resolve Destination area_id (Alamat Tujuan Pelanggan)
  const destinationRes = isValidBiteshipAreaId(cleanDestinationInput)
    ? {
        success: true,
        areaId: cleanDestinationInput,
        areas: [] as BiteshipArea[],
      }
    : await searchArea(cleanDestinationInput, options?.destinationFallbackQueries || [], options?.destinationHints);

  if (!destinationRes.success || !destinationRes.areaId || !isValidBiteshipAreaId(destinationRes.areaId)) {
    console.error('[BITESHIP_SHIPPING_DESTINATION_ERROR]', {
      destinationInput: cleanDestinationInput,
      destinationFallbackQueries: options?.destinationFallbackQueries || [],
      error: destinationRes.error,
    });

    return {
      success: false,
      rates: [],
      errorStage: 'destination',
      error: destinationRes.error || `Alamat tujuan pengiriman ("${cleanDestinationInput}") tidak ditemukan di sistem pengiriman.`,
    };
  }

  const resolvedOriginId = originRes.areaId;
  const resolvedDestinationId = destinationRes.areaId;

  console.log('[BITESHIP_SHIPPING_RESOLVED_IDS]', {
    originInput: cleanOriginInput,
    originAreaId: resolvedOriginId,
    destinationInput: cleanDestinationInput,
    destinationAreaId: resolvedDestinationId,
    weightGrams: safeWeightGrams,
    courierCompany: courierCompany || 'default',
  });

  // 3. Hitung Tarif Ongkir via API Biteship
  try {
    const rates = await getBiteshipRates(resolvedOriginId, resolvedDestinationId, safeWeightGrams, courierCompany);

    if (rates.length === 0) {
      return {
        success: true,
        rates: [],
        resolvedOriginAreaId: resolvedOriginId,
        resolvedDestinationAreaId: resolvedDestinationId,
        errorStage: 'rates',
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
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghitung tarif ongkir dari API Biteship.';

    console.error('[BITESHIP_RATES_ERROR]', {
      originAreaId: resolvedOriginId,
      destinationAreaId: resolvedDestinationId,
      weightGrams: safeWeightGrams,
      courierCompany: courierCompany || 'default',
      message,
    });

    return {
      success: false,
      rates: [],
      resolvedOriginAreaId: resolvedOriginId,
      resolvedDestinationAreaId: resolvedDestinationId,
      errorStage: 'rates',
      error: `Gagal menghitung ongkos kirim: ${message}`,
    };
  }
}
