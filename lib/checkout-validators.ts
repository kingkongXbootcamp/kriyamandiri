import { sanitizeAndValidateWhatsApp } from "@/lib/validators";
import {
  BuyerFieldErrors,
  BuyerShippingFormData,
  SavedBuyerProfile,
  VerifiedCheckoutDraft,
} from "@/types/checkout";

const BUYER_PROFILE_STORAGE_KEY = "kriyamandiri_buyer_profile";
const CHECKOUT_DRAFT_SESSION_KEY = "kriyamandiri_checkout_draft";

export function validateBuyerShippingForm(
  input: BuyerShippingFormData
): {
  isValid: boolean;
  errors: BuyerFieldErrors;
  sanitizedData: BuyerShippingFormData;
} {
  const errors: BuyerFieldErrors = {};

  const fullName = input.fullName.trim();
  const fullAddress = input.fullAddress.trim();
  const district = input.district.trim();
  const city = input.city.trim();
  const province = input.province.trim();
  const waCheck = sanitizeAndValidateWhatsApp(input.whatsappNumber);

  // 1. Validasi Nama Lengkap
  if (!fullName) {
    errors.fullName = "Nama lengkap wajib diisi.";
  } else if (fullName.length < 3) {
    errors.fullName = "Nama lengkap minimal 3 karakter.";
  } else if (fullName.length > 100) {
    errors.fullName = "Nama lengkap maksimal 100 karakter.";
  }

  // 2. Validasi Nomor WhatsApp
  if (!input.whatsappNumber.trim()) {
    errors.whatsappNumber = "Nomor WhatsApp wajib diisi.";
  } else if (!waCheck.isValid) {
    errors.whatsappNumber =
      "Format nomor WhatsApp tidak valid. Gunakan nomor aktif Indonesia (contoh: 08123456789).";
  }

  // 3. Validasi Alamat Lengkap
  if (!fullAddress) {
    errors.fullAddress = "Alamat lengkap pengiriman wajib diisi.";
  } else if (fullAddress.length < 10) {
    errors.fullAddress =
      "Alamat terlalu singkat. Cantumkan nama jalan, nomor rumah, RT/RW, atau patokan.";
  } else if (fullAddress.length > 300) {
    errors.fullAddress = "Alamat lengkap maksimal 300 karakter.";
  }

  // 4. Validasi Kecamatan
  if (!district) {
    errors.district = "Kecamatan wajib diisi.";
  } else if (district.length < 3) {
    errors.district = "Nama kecamatan minimal 3 karakter.";
  } else if (district.length > 100) {
    errors.district = "Nama kecamatan maksimal 100 karakter.";
  }

  // 5. Validasi Kota atau Kabupaten
  if (!city) {
    errors.city = "Kota atau kabupaten wajib diisi.";
  } else if (city.length < 3) {
    errors.city = "Nama kota/kabupaten minimal 3 karakter.";
  } else if (city.length > 100) {
    errors.city = "Nama kota/kabupaten maksimal 100 karakter.";
  }

  // 6. Validasi Provinsi (Opsional / Jika Diperlukan)
  if (province && province.length < 3) {
    errors.province = "Nama provinsi minimal 3 karakter jika diisi.";
  } else if (province.length > 100) {
    errors.province = "Nama provinsi maksimal 100 karakter.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      fullName,
      whatsappNumber: waCheck.isValid ? waCheck.formatted : input.whatsappNumber.trim(),
      fullAddress,
      district,
      city,
      province,
    },
  };
}

// Baca profil pembeli tersimpan dari localStorage secara aman
export function loadSavedBuyerProfile(): SavedBuyerProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(BUYER_PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedBuyerProfile>;
    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.whatsappNumber !== "string" ||
      typeof parsed.fullAddress !== "string" ||
      typeof parsed.district !== "string" ||
      typeof parsed.city !== "string"
    ) {
      return null;
    }

    return {
      fullName: parsed.fullName.slice(0, 100),
      whatsappNumber: parsed.whatsappNumber.slice(0, 20),
      fullAddress: parsed.fullAddress.slice(0, 300),
      district: parsed.district.slice(0, 100),
      city: parsed.city.slice(0, 100),
      province: typeof parsed.province === "string" ? parsed.province.slice(0, 100) : "",
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    };
  } catch {
    return null;
  }
}

// Simpan profil pembeli HANYA JIKA pengguna menyetujui (hasUserConsent === true)
export function saveBuyerProfileWithConsent(
  data: BuyerShippingFormData,
  hasUserConsent: boolean
): void {
  if (typeof window === "undefined") return;

  try {
    if (!hasUserConsent) {
      window.localStorage.removeItem(BUYER_PROFILE_STORAGE_KEY);
      return;
    }

    const safePayload: SavedBuyerProfile = {
      fullName: data.fullName.trim().slice(0, 100),
      whatsappNumber: data.whatsappNumber.trim().slice(0, 20),
      fullAddress: data.fullAddress.trim().slice(0, 300),
      district: data.district.trim().slice(0, 100),
      city: data.city.trim().slice(0, 100),
      province: data.province.trim().slice(0, 100),
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      BUYER_PROFILE_STORAGE_KEY,
      JSON.stringify(safePayload)
    );
  } catch {
    // Abaikan jika browser memblokir localStorage
  }
}

// Hapus profil pembeli dari localStorage atas permintaan pengguna
export function clearSavedBuyerProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BUYER_PROFILE_STORAGE_KEY);
  } catch {
    // Abaikan error storage
  }
}

// Simpan draf checkout terverifikasi ke sessionStorage untuk tahap pengiriman WhatsApp
export function saveVerifiedCheckoutDraft(draft: VerifiedCheckoutDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CHECKOUT_DRAFT_SESSION_KEY,
      JSON.stringify(draft)
    );
  } catch {
    // Abaikan error sessionStorage
  }
}