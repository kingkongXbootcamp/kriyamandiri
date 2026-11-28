export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ShippingRate {
  courier: string; // Kode perusahaan kurir, misal: "gojek", "grab", "jne", "sicepat"
  courier_name: string; // Nama tampilan kurir, misal: "GoSend", "GrabExpress", "JNE"
  service: string; // Kode layanan kurir, misal: "instant", "same_day", "reg"
  service_name: string; // Nama layanan kurir, misal: "Instant", "Reguler"
  description: string; // Keterangan layanan
  price: number; // Tarif ongkir dalam Rupiah
  estimated_delivery: string; // Estimasi waktu pengiriman, misal: "1 - 2 hours" atau "1 - 2 days"
  currency: string; // Mata uang, default: "IDR"
  shipping_type?: 'instant' | 'regular'; // Kategori layanan untuk pengelompokan UI
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

export interface FetchBiteshipRatesParams {
  originAreaId: string;
  destinationAreaId: string;
  weightGrams: number;
  courierCompany?: string;
  originCoordinates?: Coordinates | null;
  destinationCoordinates?: Coordinates | null;
}

export type ShippingErrorStage = 'config' | 'origin' | 'destination' | 'rates';

export interface SearchAreaResult {
  success: boolean;
  areaId: string | null;
  matchedArea?: BiteshipArea;
  areas: BiteshipArea[];
  errorStage?: ShippingErrorStage;
  error?: string;
}

export interface GetShippingRatesOptions {
  originFallbackQueries?: string[];
  destinationFallbackQueries?: string[];
  destinationHints?: {
    city?: string;
    province?: string;
  };
  originCoordinates?: Coordinates | null;
  destinationCoordinates?: Coordinates | null;
  originAddressText?: string;
  destinationAddressText?: string;
}

export interface GetShippingRatesResult {
  success: boolean;
  rates: ShippingRate[];
  resolvedOriginAreaId?: string;
  resolvedDestinationAreaId?: string;
  resolvedOriginCoordinates?: Coordinates | null;
  resolvedDestinationCoordinates?: Coordinates | null;
  errorStage?: ShippingErrorStage;
  error?: string;
}
