// Konversi teks nama toko menjadi slug yang bersih
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Hapus karakter non-alphanumeric
    .replace(/\s+/g, "-")         // Ganti spasi dengan tanda minus
    .replace(/-+/g, "-");         // Hapus minus berulang
}

// Validasi format slug: hanya huruf kecil, angka, dan minus tunggal
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

// Standarisasi dan validasi format nomor WhatsApp Indonesia (628xxx)
export function sanitizeAndValidateWhatsApp(phone: string): { isValid: boolean; formatted: string } {
  let cleaned = phone.replace(/[^0-9]/g, "");

  // Format ulang awalan nomor
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }

  // Validasi nomor seluler Indonesia: diawali 628 dan panjang 10-15 digit
  const isValid = /^628[1-9][0-9]{7,11}$/.test(cleaned);

  return {
    isValid,
    formatted: cleaned,
  };
}