

export function formatRupiahInput(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

export function parseRupiahToNumber(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function validateProductInput(input: {
  name: string;
  price: number;
  description?: string;
}): { isValid: boolean; error?: string } {
  const cleanName = input.name.trim();

  if (!cleanName) {
    return { isValid: false, error: "Nama produk wajib diisi." };
  }

  if (cleanName.length < 3) {
    return { isValid: false, error: "Nama produk minimal 3 karakter." };
  }

  if (cleanName.length > 150) {
    return { isValid: false, error: "Nama produk maksimal 150 karakter." };
  }

  if (!Number.isFinite(input.price) || input.price < 100) {
    return { isValid: false, error: "Harga produk minimal Rp 100." };
  }

  if (input.price > 999999999) {
    return { isValid: false, error: "Harga produk melebihi batas maksimal." };
  }

  if (input.description && input.description.trim().length > 500) {
    return { isValid: false, error: "Deskripsi singkat maksimal 500 karakter." };
  }

  return { isValid: true };
}