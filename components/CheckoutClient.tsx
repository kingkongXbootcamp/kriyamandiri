"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PublicProduct, PublicStore } from "@/lib/public-catalog";
import { CartItem } from "@/types/cart";
import {
  BuyerFieldErrors,
  BuyerShippingFormData,
  VerifiedCheckoutDraft,
} from "@/types/checkout";
import {
  calculateCartSummary,
  clearSingleStoreSessionCart,
  formatRupiah,
  loadSingleStoreSessionCart,
  saveSingleStoreSessionCart,
  syncCartWithCatalog,
} from "@/lib/cart-utils";
import {
  clearSavedBuyerProfile,
  loadSavedBuyerProfile,
  saveBuyerProfileWithConsent,
  saveVerifiedCheckoutDraft,
  validateBuyerShippingForm,
} from "@/lib/checkout-validators";
import { verifyCartOnServer } from "@/actions/cart";
import { generateWhatsAppOrderLink } from "@/lib/whatsapp-generator";

interface CheckoutClientProps {
  store: PublicStore;
  products: PublicProduct[];
}

export default function CheckoutClient({
  store,
  products,
}: CheckoutClientProps) {
  const [hydrated, setHydrated] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [stockNotice, setStockNotice] = useState<string | null>(null);

  // State formulir data pengiriman
  const [formData, setFormData] = useState<BuyerShippingFormData>({
    fullName: "",
    whatsappNumber: "",
    fullAddress: "",
    district: "",
    city: "",
    province: "",
  });

  // Persetujuan penyimpanan lokal browser (opt-in eksplisit)
  const [rememberBuyerData, setRememberBuyerData] = useState(false);
  const [hasStoredProfile, setHasStoredProfile] = useState(false);

  // State validasi & proses submit WhatsApp
  const [fieldErrors, setFieldErrors] = useState<BuyerFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedDraft, setVerifiedDraft] =
    useState<VerifiedCheckoutDraft | null>(null);
  const [whatsappOrderUrl, setWhatsappOrderUrl] = useState<string | null>(null);
  const [generatedMessagePreview, setGeneratedMessagePreview] = useState<
    string | null
  >(null);

  // 1. Muat isi keranjang sesi & data pembeli tersimpan (jika pernah disetujui)
  useEffect(() => {
    const { items: sessionItems } = loadSingleStoreSessionCart(store);
    const { validItems, removedUnavailableNames } = syncCartWithCatalog(
      sessionItems,
      products
    );

    setCartItems(validItems);
    saveSingleStoreSessionCart(store, validItems);

    if (removedUnavailableNames.length > 0) {
      setStockNotice(
        `Produk berikut dihapus otomatis karena stok baru saja habis: ${removedUnavailableNames.join(", ")}.`
      );
    }

    const savedProfile = loadSavedBuyerProfile();
    if (savedProfile) {
      setFormData({
        fullName: savedProfile.fullName,
        whatsappNumber: savedProfile.whatsappNumber,
        fullAddress: savedProfile.fullAddress,
        district: savedProfile.district,
        city: savedProfile.city,
        province: savedProfile.province,
      });
      setRememberBuyerData(true);
      setHasStoredProfile(true);
    }

    setHydrated(true);
  }, [store, products]);

  const cartSummary = useMemo(
    () => calculateCartSummary(cartItems),
    [cartItems]
  );

  const handleFieldChange = (
    field: keyof BuyerShippingFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleToggleConsent = (checked: boolean) => {
    setRememberBuyerData(checked);
    if (!checked && hasStoredProfile) {
      clearSavedBuyerProfile();
      setHasStoredProfile(false);
    }
  };

  const handleForgetSavedData = () => {
    clearSavedBuyerProfile();
    setRememberBuyerData(false);
    setHasStoredProfile(false);
    setFormData({
      fullName: "",
      whatsappNumber: "",
      fullAddress: "",
      district: "",
      city: "",
      province: "",
    });
    setFieldErrors({});
  };

  const handleSendToWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // 1. Validasi seluruh kolom formulir pengiriman
    const validation = validateBuyerShippingForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setSubmitError(
        "Mohon lengkapi dan perbaiki data pengiriman yang ditandai merah."
      );
      return;
    }

    if (cartSummary.items.length === 0) {
      setSubmitError(
        "Keranjang belanja Anda kosong. Silakan pilih produk terlebih dahulu."
      );
      return;
    }

    setSubmitting(true);

    try {
      // 2. Verifikasi ulang harga, stok, & nomor WA toko langsung di sisi server
      const serverVerification = await verifyCartOnServer(
        store.slug,
        cartSummary.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      );

      if (!serverVerification.valid || !serverVerification.storeWhatsappNumber) {
        setSubmitError(
          serverVerification.errors.join(" ") ||
            "Sebagian produk di keranjang mengalami perubahan stok atau harga."
        );
        setSubmitting(false);
        return;
      }

      // 3. Simpan atau hapus data pembeli di localStorage sesuai persetujuan pengguna
      saveBuyerProfileWithConsent(validation.sanitizedData, rememberBuyerData);
      setHasStoredProfile(rememberBuyerData);

      // 4. Rakit pesan pesanan otomatis dan URL-encoded link resmi wa.me
      const generatedOrder = generateWhatsAppOrderLink({
        storeName: serverVerification.storeName || store.name,
        storeWhatsappNumber: serverVerification.storeWhatsappNumber,
        items: serverVerification.items,
        totalAmount: serverVerification.totalAmount,
        buyer: validation.sanitizedData,
      });

      const totalQuantity = serverVerification.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const draft: VerifiedCheckoutDraft = {
        storeId: store.id,
        storeName: serverVerification.storeName || store.name,
        storeSlug: store.slug,
        buyer: validation.sanitizedData,
        items: serverVerification.items,
        totalQuantity,
        subtotalAmount: serverVerification.totalAmount,
        shippingIncluded: false,
        verifiedAt: new Date().toISOString(),
      };

      saveVerifiedCheckoutDraft(draft);
      clearSingleStoreSessionCart();

      setVerifiedDraft(draft);
      setWhatsappOrderUrl(generatedOrder.whatsappUrl);
      setGeneratedMessagePreview(generatedOrder.messageText);
      setSubmitting(false);

      // 5. Buka aplikasi WhatsApp penjual secara langsung (ramah mobile & bebas blokir popup)
      window.location.assign(generatedOrder.whatsappUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi gangguan koneksi saat memverifikasi pesanan. Silakan coba lagi.";
      setSubmitError(message);
      setSubmitting(false);
    }
  };

  // Tampilan saat hidrasi awal
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-7 h-7 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-gray-500">
            Memuat ringkasan pesanan...
          </p>
        </div>
      </div>
    );
  }

  // Tampilan setelah pesanan berhasil diteruskan ke WhatsApp penjual
  if (verifiedDraft && whatsappOrderUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href={`/${store.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-700 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Kembali ke Katalog</span>
            </Link>
            <span className="text-xs font-extrabold text-emerald-700 truncate max-w-[170px]">
              {store.name}
            </span>
          </div>
        </header>

        <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-5 pb-12 space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-extrabold text-gray-900">
                  Pesanan Siap Dikirim via WhatsApp
                </h1>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Jika aplikasi WhatsApp tidak terbuka otomatis, tekan tombol
                  hijau di bawah ini lalu tekan tombol{" "}
                  <strong>Kirim (Send)</strong> di WhatsApp.
                </p>
              </div>
            </div>

            {/* Peringatan Status Pesanan yang Jujur */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Penting:</strong> Pesanan ini{" "}
              <strong>belum dibayar dan belum diterima penjual</strong> sebelum
              Anda mengirimkan pesan di WhatsApp serta menerima balasan total
              ongkir dan nomor rekening dari <strong>{verifiedDraft.storeName}</strong>.
            </div>

            {/* Tombol Cadangan Buka WhatsApp */}
            <a
              href={whatsappOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.99] text-white text-sm font-extrabold rounded-xl shadow-sm transition"
            >
              <span>Buka WhatsApp Penjual Sekarang</span>
            </a>

            {/* Pratinjau Teks Pesan yang Dihasilkan */}
            {generatedMessagePreview && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Pratinjau Format Pesan WhatsApp
                </p>
                <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {generatedMessagePreview}
                </pre>
              </div>
            )}

            <div className="pt-1">
              <Link
                href={`/${store.slug}`}
                className="flex items-center justify-center w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl transition"
              >
                Kembali ke Katalog Toko
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Tampilan jika keranjang kosong
  if (cartSummary.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href={`/${store.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-700 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Kembali ke Katalog</span>
            </Link>
            <span className="text-xs font-bold text-gray-500 truncate max-w-[160px]">
              {store.name}
            </span>
          </div>
        </header>

        <main className="flex-1 max-w-lg w-full mx-auto p-4 flex items-center justify-center">
          <div className="w-full bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm space-y-3">
            <h1 className="text-base font-extrabold text-gray-900">
              Keranjang Belanja Kosong
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pilih minimal satu produk dari katalog{" "}
              <strong className="text-gray-700">{store.name}</strong> sebelum
              mengisi data pengiriman.
            </p>
            <div className="pt-2">
              <Link
                href={`/${store.slug}`}
                className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
              >
                Kembali ke Katalog
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Navigasi Atas dengan Tombol Kembali ke Katalog */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link
            href={`/${store.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-700 py-1.5 transition"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Kembali ke Katalog</span>
          </Link>
          <span className="text-xs font-extrabold text-emerald-700 truncate max-w-[170px]">
            {store.name}
          </span>
        </div>
      </header>

      {/* Konten Utama Mobile-First */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-12 space-y-4">
        <div>
          <h1 className="text-lg font-extrabold text-gray-900">
            Checkout & Data Pengiriman
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Periksa rincian pesanan dan lengkapi alamat pengiriman Anda.
          </p>
        </div>

        {stockNotice && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs leading-relaxed"
          >
            {stockNotice}
          </div>
        )}

        {/* ================= BAGIAN 1: RINGKASAN PESANAN ================= */}
        <section
          aria-label="Ringkasan Pesanan"
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h2 className="text-sm font-extrabold text-gray-900">
              Ringkasan Pesanan
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {cartSummary.totalItems} Barang
            </span>
          </div>

          {/* Daftar Barang */}
          <ul className="divide-y divide-gray-100">
            {cartSummary.items.map((item) => (
              <li
                key={item.productId}
                className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 text-center px-1">
                        Produk
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {item.quantity} &times; {formatRupiah(item.price)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-gray-900 shrink-0">
                  {formatRupiah(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>

          {/* Ringkasan Jumlah & Total Harga Barang */}
          <div className="pt-3 border-t border-gray-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span>Ringkasan Jumlah</span>
              <span className="font-bold text-gray-900">
                {cartSummary.totalItems} barang ({cartSummary.items.length} jenis produk)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="font-bold text-gray-900">Total Harga Barang</span>
              <span className="text-base font-extrabold text-emerald-700">
                {formatRupiah(cartSummary.totalAmount)}
              </span>
            </div>

            {/* Keterangan Ongkir Belum Termasuk */}
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
              <svg
                className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                <strong>Belum termasuk ongkos kirim.</strong> Total ongkir dan
                konfirmasi pembayaran akan diinformasikan oleh penjual melalui
                WhatsApp.
              </span>
            </div>
          </div>
        </section>

        {/* ================= BAGIAN 2: FORMULIR DATA PENGIRIMAN ================= */}
        <section
          aria-label="Formulir Data Pengiriman"
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <h2 className="text-sm font-extrabold text-gray-900">
              Data Penerima & Alamat Pengiriman
            </h2>
            {hasStoredProfile && (
              <button
                type="button"
                onClick={handleForgetSavedData}
                className="text-[11px] font-semibold text-rose-600 hover:underline shrink-0"
              >
                Hapus data tersimpan
              </button>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium leading-relaxed"
            >
              {submitError}
            </div>
          )}

          <form onSubmit={handleSendToWhatsApp} noValidate className="space-y-3.5">
            {/* 1. Nama Lengkap */}
            <div>
              <label
                htmlFor="buyer-fullname"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Nama Lengkap <span className="text-rose-600">*</span>
              </label>
              <input
                id="buyer-fullname"
                type="text"
                autoComplete="name"
                maxLength={100}
                value={formData.fullName}
                onChange={(e) => handleFieldChange("fullName", e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.fullName
                    ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                    : "border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* 2. Nomor WhatsApp */}
            <div>
              <label
                htmlFor="buyer-whatsapp"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Nomor WhatsApp Aktif <span className="text-rose-600">*</span>
              </label>
              <input
                id="buyer-whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                value={formData.whatsappNumber}
                onChange={(e) =>
                  handleFieldChange("whatsappNumber", e.target.value)
                }
                placeholder="Contoh: 081234567890"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.whatsappNumber
                    ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                    : "border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />
              {fieldErrors.whatsappNumber && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">
                  {fieldErrors.whatsappNumber}
                </p>
              )}
            </div>

            {/* 3. Alamat Lengkap */}
            <div>
              <label
                htmlFor="buyer-address"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Alamat Lengkap <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="buyer-address"
                rows={3}
                autoComplete="street-address"
                maxLength={300}
                value={formData.fullAddress}
                onChange={(e) => handleFieldChange("fullAddress", e.target.value)}
                placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan/desa, atau patokan lokasi"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.fullAddress
                    ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                    : "border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />
              {fieldErrors.fullAddress && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">
                  {fieldErrors.fullAddress}
                </p>
              )}
            </div>

            {/* 4. Kecamatan */}
            <div>
              <label
                htmlFor="buyer-district"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Kecamatan <span className="text-rose-600">*</span>
              </label>
              <input
                id="buyer-district"
                type="text"
                maxLength={100}
                value={formData.district}
                onChange={(e) => handleFieldChange("district", e.target.value)}
                placeholder="Contoh: Beji"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.district
                    ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                    : "border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />
              {fieldErrors.district && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">
                  {fieldErrors.district}
                </p>
              )}
            </div>

            {/* 5. Kota atau Kabupaten */}
            <div>
              <label
                htmlFor="buyer-city"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Kota / Kabupaten <span className="text-rose-600">*</span>
              </label>
              <input
                id="buyer-city"
                type="text"
                autoComplete="address-level2"
                maxLength={100}
                value={formData.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                placeholder="Contoh: Kota Depok"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.city
                    ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                    : "border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />
              {fieldErrors.city && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">
                  {fieldErrors.city}
                </p>
              )}
            </div>

            {/* 6. Provinsi (Opsional) */}
            <div>
              <label
                htmlFor="buyer-province"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Provinsi <span className="text-gray-400 font-normal">(Opsional)</span>
              </label>
              <input
                id="buyer-province"
                type="text"
                autoComplete="address-level1"
                maxLength={100}
                value={formData.province}
                onChange={(e) => handleFieldChange("province", e.target.value)}
                placeholder="Contoh: Jawa Barat"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.province
                    ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                    : "border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />
              {fieldErrors.province && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">
                  {fieldErrors.province}
                </p>
              )}
            </div>

            {/* Kotak Persetujuan Penyimpanan Data Pembeli di Browser (Opt-In) */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberBuyerData}
                  onChange={(e) => handleToggleConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  <strong>Simpan data pengiriman di browser ini</strong> agar
                  otomatis terisi saat saya berbelanja lagi. Data hanya disimpan
                  di perangkat Anda.
                </span>
              </label>
            </div>

            {/* Tombol Kirim Pesanan ke WhatsApp Penjual & Kembali ke Katalog */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.99] disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z" />
                </svg>
                <span>
                  {submitting
                    ? "Memverifikasi Pesanan..."
                    : "KIRIM PESANAN KE WHATSAPP PENJUAL"}
                </span>
              </button>

              <Link
                href={`/${store.slug}`}
                className="flex items-center justify-center w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl transition"
              >
                Kembali ke Katalog
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}