export interface ShippingRate {
  courier: string; // Kode perusahaan kurir, misal: "jne", "jnt", "sicepat"
  courier_name: string; // Nama tampilan kurir, misal: "JNE", "J&T Express"
  service: string; // Kode layanan kurir, misal: "reg", "yes", "ez"
  service_name: string; // Nama layanan kurir, misal: "Reguler"
  description: string; // Keterangan layanan
  price: number; // Tarif ongkir dalam Rupiah
  estimated_delivery: string; // Estimasi waktu pengiriman, misal: "1 - 2 days"
  currency: string; // Mata uang, default: "IDR"
}

export interface BiteshipArea {
  id: string;
  name: string;
  country_name: string;
  country_code: string;
  administrative_division_level_1_name: string; // Provinsi
  administrative_division_level_1_type: string;
  administrative_division_level_2_name: string; // Kota / Kabupaten
  administrative_division_level_2_type: string;
  administrative_division_level_3_name: string; // Kecamatan
  administrative_division_level_3_type: string;
  postal_code: number;
}

export interface BiteshipAreaResponse {
  success: boolean;
  areas?: BiteshipArea[];
  error?: string;
  message?: string;
  code?: number;
}

export interface BiteshipPricingItem {
  available_for_cash_on_delivery?: boolean;
  available_for_proof_of_delivery?: boolean;
  available_for_instant_waybill_id?: boolean;
  available_for_insurance?: boolean;
  company: string;
  courier_name: string;
  courier_service_name: string;
  courier_service_code: string;
  currency?: string;
  description?: string;
  duration?: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
  service_type?: string;
  shipping_type?: string;
  price: number;
  type?: string;
}

export interface BiteshipCourierResponse {
  success: boolean;
  object?: string;
  message?: string;
  code?: number;
  error?: string;
  pricing?: BiteshipPricingItem[];
}
