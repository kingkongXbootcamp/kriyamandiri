"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Info,
  AlertCircle,
  MessageCircle,
  ShoppingBag,
  ImageOff,
  Loader2,
} from "lucide-react";
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

      // 5. Buka aplikasi WhatsApp penjual secara langsung
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

  // Loading state saat hidrasi keranjang & profil lokal
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="space-y-2.5 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-slate-500">
            Memuat ringkasan pesanan...
          </p>
        </div>
      </div>
    );
  }

  // Tampilan setelah pesanan berhasil diteruskan ke WhatsApp penjual
  if (verifiedDraft && whatsappOrderUrl) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
            <Link
              href={`/${store.slug}`}
              className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold text-slate-700 transition hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Katalog</span>
            </Link>
            <span className="max-w-[180px] truncate text-xs font-extrabold text-emerald-700">
              {store.name}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pt-6 pb-12">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 sm:text-lg">
                  Pesanan Siap Dikirim via WhatsApp
                </h1>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Jika aplikasi WhatsApp tidak terbuka otomatis, tekan tombol
                  hijau di bawah ini lalu tekan tombol{" "}
                  <strong>Kirim (Send)</strong> di WhatsApp.
                </p>
              </div>
            </div>

            {/* Peringatan Status Pesanan yang Jujur */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950">
              <strong>Penting:</strong> Pesanan ini{" "}
              <strong>belum dibayar dan belum diterima penjual</strong> sebelum
              Anda mengirimkan pesan di WhatsApp serta menerima balasan total
              ongkir dan nomor rekening dari{" "}
              <strong>{verifiedDraft.storeName}</strong>.
            </div>

            {/* Tombol Cadangan Buka WhatsApp */}
            <a
              href={whatsappOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#1EBE5D] active:scale-[0.99]"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Buka WhatsApp Penjual Sekarang</span>
            </a>

            {/* Pratinjau Teks Pesan yang Dihasilkan */}
            {generatedMessagePreview && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Pratinjau Format Pesan WhatsApp
                </p>
                <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-sans text-xs leading-relaxed text-slate-800">
                  {generatedMessagePreview}
                </pre>
              </div>
            )}

            <div className="pt-1">
              <Link
                href={`/${store.slug}`}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Kembali ke Katalog Toko
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Empty state jika keranjang kosong
  if (cartSummary.items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
            <Link
              href={`/${store.slug}`}
              className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold text-slate-700 transition hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Katalog</span>
            </Link>
            <span className="max-w-[180px] truncate text-xs font-bold text-slate-500">
              {store.name}
            </span>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-4">
          <div className="w-full space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h1 className="text-base font-extrabold text-slate-900">
              Keranjang Belanja Kosong
            </h1>
            <p className="text-xs leading-relaxed text-slate-500">
              Pilih minimal satu produk dari katalog{" "}
              <strong className="text-slate-700">{store.name}</strong> sebelum
              mengisi data pengiriman.
            </p>
            <div className="pt-2">
              <Link
                href={`/${store.slug}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header Navigasi Atas dengan Tombol Kembali ke Katalog */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href={`/${store.slug}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold text-slate-700 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Kembali ke Katalog</span>
          </Link>
          <span className="max-w-[180px] truncate text-xs font-extrabold text-emerald-700 sm:text-sm">
            {store.name}
          </span>
        </div>
      </header>

      {/* Konten Utama Responsif (1 Kolom Mobile, 2 Kolom Desktop) */}
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 pt-5 pb-12 sm:px-6">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">
            Checkout & Data Pengiriman
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Periksa rincian pesanan dan lengkapi alamat pengiriman Anda.
          </p>
        </div>

        {stockNotice && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{stockNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start md:gap-5">
          {/* ================= BAGIAN 1: RINGKASAN PESANAN ================= */}
          <section
            aria-label="Ringkasan Pesanan"
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-20 md:order-2 md:col-span-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-extrabold text-slate-900">
                Ringkasan Pesanan
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {cartSummary.totalItems} Barang
              </span>
            </div>

            <ul className="divide-y divide-slate-100">
              {cartSummary.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <ImageOff className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.quantity} &times; {formatRupiah(item.price)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-extrabold text-slate-900">
                    {formatRupiah(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Ringkasan Jumlah</span>
                <span className="font-bold text-slate-900">
                  {cartSummary.totalItems} barang ({cartSummary.items.length}{" "}
                  jenis)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-sm">
                <span className="font-bold text-slate-900">
                  Total Harga Barang
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatRupiah(cartSummary.totalAmount)}
                </span>
              </div>

              {/* Keterangan Ongkir Belum Termasuk */}
              <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-[11px] leading-relaxed text-blue-950">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
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
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:order-1 md:col-span-7"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
                Data Penerima & Alamat Pengiriman
              </h2>
              {hasStoredProfile && (
                <button
                  type="button"
                  onClick={handleForgetSavedData}
                  className="min-h-[32px] shrink-0 text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Hapus data tersimpan
                </button>
              )}
            </div>

            {submitError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium leading-relaxed text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            <form
              onSubmit={handleSendToWhatsApp}
              noValidate
              className="space-y-3.5"
            >
              {/* 1. Nama Lengkap */}
              <div>
                <label
                  htmlFor="buyer-fullname"
                  className="mb-1 block text-xs font-bold text-slate-700"
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
                  className={`h-11 w-full rounded-xl border px-3.5 text-base text-slate-900 outline-none transition sm:text-sm ${
                    fieldErrors.fullName
                      ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* 2. Nomor WhatsApp */}
              <div>
                <label
                  htmlFor="buyer-whatsapp"
                  className="mb-1 block text-xs font-bold text-slate-700"
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
                  className={`h-11 w-full rounded-xl border px-3.5 text-base text-slate-900 outline-none transition sm:text-sm ${
                    fieldErrors.whatsappNumber
                      ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  }`}
                />
                {fieldErrors.whatsappNumber && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {fieldErrors.whatsappNumber}
                  </p>
                )}
              </div>

              {/* 3. Alamat Lengkap */}
              <div>
                <label
                  htmlFor="buyer-address"
                  className="mb-1 block text-xs font-bold text-slate-700"
                >
                  Alamat Lengkap <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="buyer-address"
                  rows={3}
                  autoComplete="street-address"
                  maxLength={300}
                  value={formData.fullAddress}
                  onChange={(e) =>
                    handleFieldChange("fullAddress", e.target.value)
                  }
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan/desa, atau patokan lokasi"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-base text-slate-900 outline-none transition sm:text-sm ${
                    fieldErrors.fullAddress
                      ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  }`}
                />
                {fieldErrors.fullAddress && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {fieldErrors.fullAddress}
                  </p>
                )}
              </div>

              {/* 4. Kecamatan & 5. Kota / Kabupaten */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="buyer-district"
                    className="mb-1 block text-xs font-bold text-slate-700"
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
                    className={`h-11 w-full rounded-xl border px-3.5 text-base text-slate-900 outline-none transition sm:text-sm ${
                      fieldErrors.district
                        ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                    }`}
                  />
                  {fieldErrors.district && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      {fieldErrors.district}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="buyer-city"
                    className="mb-1 block text-xs font-bold text-slate-700"
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
                    className={`h-11 w-full rounded-xl border px-3.5 text-base text-slate-900 outline-none transition sm:text-sm ${
                      fieldErrors.city
                        ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      {fieldErrors.city}
                    </p>
                  )}
                </div>
              </div>

              {/* 6. Provinsi (Opsional) */}
              <div>
                <label
                  htmlFor="buyer-province"
                  className="mb-1 block text-xs font-bold text-slate-700"
                >
                  Provinsi{" "}
                  <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                <input
                  id="buyer-province"
                  type="text"
                  autoComplete="address-level1"
                  maxLength={100}
                  value={formData.province}
                  onChange={(e) => handleFieldChange("province", e.target.value)}
                  placeholder="Contoh: Jawa Barat"
                  className={`h-11 w-full rounded-xl border px-3.5 text-base text-slate-900 outline-none transition sm:text-sm ${
                    fieldErrors.province
                      ? "border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  }`}
                />
                {fieldErrors.province && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {fieldErrors.province}
                  </p>
                )}
              </div>

              {/* Kotak Persetujuan Penyimpanan Data Pembeli di Browser (Opt-In) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex cursor-pointer select-none items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberBuyerData}
                    onChange={(e) => handleToggleConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <span className="text-xs leading-relaxed text-slate-700">
                    <strong>Simpan data pengiriman di browser ini</strong> agar
                    otomatis terisi saat saya berbelanja lagi. Data hanya
                    disimpan di perangkat Anda.
                  </span>
                </label>
              </div>

              {/* Tombol Kirim Pesanan ke WhatsApp Penjual & Kembali ke Katalog */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#1EBE5D] active:scale-[0.99] disabled:opacity-50 sm:text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Memverifikasi Pesanan...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5 shrink-0" />
                      <span>KIRIM PESANAN KE WHATSAPP PENJUAL</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/${store.slug}`}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Kembali ke Katalog
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}