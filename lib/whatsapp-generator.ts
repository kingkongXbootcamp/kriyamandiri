import { sanitizeAndValidateWhatsApp } from "@/lib/validators";
import { stripControlChars } from "@/lib/security";
import { VerifiedCartItem } from "@/types/cart";
import { BuyerShippingFormData } from "@/types/checkout";

export interface WhatsAppOrderPayload {
  storeName: string;
  storeWhatsappNumber: string;
  items: VerifiedCartItem[];
  totalAmount: number;
  buyer: BuyerShippingFormData;
}

export interface GeneratedWhatsAppOrder {
  recipientPhone: string;
  messageText: string;
  whatsappUrl: string;
}

export function formatPlainRupiah(amount: number): string {
  const safeAmount = Number.isFinite(amount)
    ? Math.max(0, Math.round(amount))
    : 0;
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function buildWhatsAppOrderMessage(
  payload: Omit<WhatsAppOrderPayload, "storeWhatsappNumber">
): string {
  const cleanStoreName =
    stripControlChars(payload.storeName || "").trim() || "Penjual";

  const itemLines = payload.items.map((item, index) => {
    const cleanItemName = stripControlChars(item.name || "").trim();
    const unitPriceFormatted = formatPlainRupiah(item.unitPrice);
    const subtotalFormatted = formatPlainRupiah(item.subtotal);
    return `${index + 1}. ${cleanItemName} - ${item.quantity} pcs x Rp${unitPriceFormatted}\n   Subtotal: Rp${subtotalFormatted}`;
  });

  const totalFormatted = formatPlainRupiah(payload.totalAmount);

  const shippingLines = [
    `Nama: ${stripControlChars(payload.buyer.fullName || "").trim()}`,
    `No. HP: ${stripControlChars(payload.buyer.whatsappNumber || "").trim()}`,
    `Alamat: ${stripControlChars(payload.buyer.fullAddress || "").trim()}`,
    `Kecamatan: ${stripControlChars(payload.buyer.district || "").trim()}`,
    `Kota: ${stripControlChars(payload.buyer.city || "").trim()}`,
  ];

  if (payload.buyer.province && payload.buyer.province.trim().length > 0) {
    shippingLines.push(
      `Provinsi: ${stripControlChars(payload.buyer.province).trim()}`
    );
  }

  return [
    `Halo ${cleanStoreName}, saya mau pesan barang dari katalog online Anda.`,
    "",
    "DETAIL PESANAN:",
    ...itemLines,
    "",
    `TOTAL HARGA BARANG: Rp${totalFormatted}`,
    "Belum termasuk ongkir.",
    "",
    "DATA PENGIRIMAN:",
    ...shippingLines,
    "",
    "Mohon diinformasikan total ongkir dan nomor rekening pembayarannya.",
    "Terima kasih!",
    "",
    "Dibuat otomatis via aplikasi KRIYAMANDIRI.",
  ].join("\n");
}

export function generateWhatsAppOrderLink(
  payload: WhatsAppOrderPayload
): GeneratedWhatsAppOrder {
  if (!payload.items || payload.items.length === 0) {
    throw new Error("Daftar produk pesanan tidak boleh kosong.");
  }

  const waValidation = sanitizeAndValidateWhatsApp(payload.storeWhatsappNumber);
  if (!waValidation.isValid) {
    throw new Error(
      "Nomor WhatsApp toko tujuan tidak valid. Silakan hubungi pemilik toko."
    );
  }

  const messageText = buildWhatsAppOrderMessage({
    storeName: payload.storeName,
    items: payload.items,
    totalAmount: payload.totalAmount,
    buyer: payload.buyer,
  });

  const encodedMessage = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${waValidation.formatted}?text=${encodedMessage}`;

  return {
    recipientPhone: waValidation.formatted,
    messageText,
    whatsappUrl,
  };
}