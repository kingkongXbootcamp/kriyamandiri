import { VerifiedCartItem } from "@/types/cart";

export interface BuyerShippingFormData {
  fullName: string;
  whatsappNumber: string;
  fullAddress: string;
  district: string; // Kecamatan
  city: string; // Kota atau Kabupaten
  province: string; // Provinsi (opsional / jika diperlukan)
}

export interface BuyerFieldErrors {
  fullName?: string;
  whatsappNumber?: string;
  fullAddress?: string;
  district?: string;
  city?: string;
  province?: string;
}

export interface SavedBuyerProfile extends BuyerShippingFormData {
  savedAt: string;
}

export interface VerifiedCheckoutDraft {
  storeId: string;
  storeName: string;
  storeSlug: string;
  buyer: BuyerShippingFormData;
  items: VerifiedCartItem[];
  totalQuantity: number;
  subtotalAmount: number;
  shippingIncluded: false;
  verifiedAt: string;
}