'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PublicProduct, PublicStore } from '@/lib/public-catalog';
import { CartItem } from '@/types/cart';
import { BuyerFieldErrors, BuyerShippingFormData, VerifiedCheckoutDraft } from '@/types/checkout';
import { ShippingErrorStage, ShippingRate } from '@/types/shipping';
import { calculateCartSummary, formatRupiah, loadSingleStoreSessionCart, saveSingleStoreSessionCart, syncCartWithCatalog } from '@/lib/cart-utils';
import { clearSavedBuyerProfile, loadSavedBuyerProfile, saveBuyerProfileWithConsent, saveVerifiedCheckoutDraft, validateBuyerShippingForm } from '@/lib/checkout-validators';
import { verifyCartOnServer } from '@/actions/cart';
import { getShippingRates } from '@/actions/shipping';
import ShippingSelector from '@/components/ShippingSelector';

interface CheckoutClientProps {
  store: PublicStore;
  products: PublicProduct[];
}

export default function CheckoutClient({ store, products }: CheckoutClientProps) {
  const [hydrated, setHydrated] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [stockNotice, setStockNotice] = useState<string | null>(null);

  // State formulir data pengiriman
  const [formData, setFormData] = useState<BuyerShippingFormData>({
    fullName: '',
    whatsappNumber: '',
    fullAddress: '',
    district: '',
    city: '',
    province: '',
  });

  // Persetujuan penyimpanan lokal browser (opt-in eksplisit)
  const [rememberBuyerData, setRememberBuyerData] = useState(false);
  const [hasStoredProfile, setHasStoredProfile] = useState(false);

  // State ongkos kirim & kurir Biteship
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [resolvedDestinationAreaId, setResolvedDestinationAreaId] = useState<string | undefined>(undefined);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesErrorStage, setRatesErrorStage] = useState<ShippingErrorStage | null>(null);
  const [lastCheckedRouteKey, setLastCheckedRouteKey] = useState<string>('');

  // State validasi & proses submit
  const [fieldErrors, setFieldErrors] = useState<BuyerFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedDraft, setVerifiedDraft] = useState<VerifiedCheckoutDraft | null>(null);

  // 1. Muat isi keranjang sesi & data pembeli tersimpan (jika pernah disetujui)
  useEffect(() => {
    const { items: sessionItems } = loadSingleStoreSessionCart(store);
    const { validItems, removedUnavailableNames } = syncCartWithCatalog(sessionItems, products);

    setCartItems(validItems);
    saveSingleStoreSessionCart(store, validItems);

    if (removedUnavailableNames.length > 0) {
      setStockNotice(`Produk berikut dihapus otomatis karena stok baru saja habis: ${removedUnavailableNames.join(', ')}.`);
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

  const cartSummary = useMemo(() => calculateCartSummary(cartItems), [cartItems]);

  // Hitung total berat paket (gram) dari seluruh item keranjang (minimal 250 gr)
  const totalWeightGrams = useMemo(() => {
    const total = cartItems.reduce((sum, item) => {
      const unitWeight = typeof item.weight_grams === 'number' && item.weight_grams > 0 ? item.weight_grams : 250;
      return sum + unitWeight * item.quantity;
    }, 0);
    return Math.max(250, total);
  }, [cartItems]);

  // Kalkulasi ongkir & total akhir (subtotal + shipping_cost)
  const shippingCost = selectedRate ? selectedRate.price : 0;
  const finalTotalAmount = cartSummary.subtotalAmount + shippingCost;

  // Fungsi ambil tarif ongkir real-time dari Server Action getShippingRates
  const fetchRatesForAddress = useCallback(
    async (district: string, city: string, province: string) => {
      const cleanDistrict = district.trim();
      const cleanCity = city.trim();
      const cleanProvince = province.trim();

      if (cleanDistrict.length < 3 || cleanCity.length < 3) {
        return;
      }

      // Siapkan query alamat asal toko selengkap mungkin + fallback kode pos / alamat toko
      const originPrimary = (store.origin_area_id || [store.city, store.origin_postal_code].filter(Boolean).join(', ') || '').trim();

      const originFallbacks = [store.origin_postal_code || '', store.origin_address ? `${store.city}, ${store.origin_address}` : '', store.city || ''].filter(Boolean);

      // Siapkan query alamat tujuan pembeli + fallback bertahap
      const destinationPrimary = [cleanDistrict, cleanCity, cleanProvince].filter(Boolean).join(', ');

      const destinationFallbacks = [`${cleanDistrict}, ${cleanCity}`, cleanDistrict].filter(Boolean);

      setLoadingRates(true);
      setRatesError(null);
      setRatesErrorStage(null);

      try {
        const result = await getShippingRates(originPrimary, destinationPrimary, totalWeightGrams, undefined, {
          originFallbackQueries: originFallbacks,
          destinationFallbackQueries: destinationFallbacks,
          destinationHints: {
            city: cleanCity,
            province: cleanProvince,
          },
        });

        if (!result.success) {
          setShippingRates([]);
          setSelectedRate(null);
          setRatesErrorStage(result.errorStage || null);
          setRatesError(result.error || 'Gagal mengecek tarif pengiriman untuk alamat ini.');
          return;
        }

        setShippingRates(result.rates);
        setResolvedDestinationAreaId(result.resolvedDestinationAreaId);
        setRatesErrorStage(result.rates.length === 0 ? result.errorStage || 'rates' : null);
        setRatesError(result.rates.length === 0 ? result.error || null : null);

        // Pertahankan pilihan kurir sebelumnya jika masih tersedia, atau pilih yang termurah
        setSelectedRate((prevSelected) => {
          if (result.rates.length === 0) return null;
          if (prevSelected) {
            const stillExists = result.rates.find((r) => r.courier === prevSelected.courier && r.service === prevSelected.service);
            if (stillExists) return stillExists;
          }
          return result.rates[0];
        });
      } catch {
        setShippingRates([]);
        setSelectedRate(null);
        setRatesErrorStage('rates');
        setRatesError('Terjadi gangguan koneksi saat mengambil tarif pengiriman.');
      } finally {
        setLoadingRates(false);
      }
    },
    [store.origin_area_id, store.origin_postal_code, store.origin_address, store.city, totalWeightGrams],
  );

  // Otomatis cek ongkir saat checkout dimuat (jika alamat sudah terisi) atau saat kecamatan/kota diubah
  useEffect(() => {
    if (!hydrated || cartItems.length === 0) return;

    const cleanDistrict = formData.district.trim();
    const cleanCity = formData.city.trim();
    const cleanProvince = formData.province.trim();

    if (cleanDistrict.length < 3 || cleanCity.length < 3) {
      setShippingRates([]);
      setSelectedRate(null);
      setRatesError(null);
      setRatesErrorStage(null);
      setLastCheckedRouteKey('');
      return;
    }

    const routeKey = `${cleanDistrict.toLowerCase()}|${cleanCity.toLowerCase()}|${cleanProvince.toLowerCase()}|${totalWeightGrams}`;
    if (routeKey === lastCheckedRouteKey) return;

    const debounceTimer = window.setTimeout(() => {
      setLastCheckedRouteKey(routeKey);
      fetchRatesForAddress(cleanDistrict, cleanCity, cleanProvince);
    }, 650);

    return () => window.clearTimeout(debounceTimer);
  }, [hydrated, cartItems.length, formData.district, formData.city, formData.province, totalWeightGrams, lastCheckedRouteKey, fetchRatesForAddress]);

  const handleFieldChange = (field: keyof BuyerShippingFormData, value: string) => {
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
      fullName: '',
      whatsappNumber: '',
      fullAddress: '',
      district: '',
      city: '',
      province: '',
    });
    setShippingRates([]);
    setSelectedRate(null);
    setRatesError(null);
    setRatesErrorStage(null);
    setLastCheckedRouteKey('');
    setFieldErrors({});
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // 1. Validasi seluruh kolom formulir pengiriman
    const validation = validateBuyerShippingForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setSubmitError('Mohon lengkapi dan perbaiki data pengiriman yang ditandai merah.');
      return;
    }

    if (cartSummary.items.length === 0) {
      setSubmitError('Keranjang belanja Anda kosong. Silakan pilih produk terlebih dahulu.');
      return;
    }

    if (!selectedRate) {
      setSubmitError('Silakan pilih layanan kurir pengiriman terlebih dahulu sebelum melanjutkan.');
      return;
    }

    setSubmitting(true);

    try {
      // 2. Verifikasi harga & stok terbaru langsung di sisi server
      const serverVerification = await verifyCartOnServer(
        store.slug,
        cartSummary.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );

      if (!serverVerification.valid) {
        setSubmitError(serverVerification.errors.join(' ') || 'Sebagian produk di keranjang mengalami perubahan stok atau harga.');
        setSubmitting(false);
        return;
      }

      // 3. Simpan atau hapus data pembeli di localStorage sesuai pilihan persetujuan pengguna
      saveBuyerProfileWithConsent(validation.sanitizedData, rememberBuyerData);
      setHasStoredProfile(rememberBuyerData);

      // 4. Simpan draf pesanan terverifikasi lengkap dengan ongkir terpilih
      const totalQuantity = serverVerification.items.reduce((sum, item) => sum + item.quantity, 0);
      const verifiedTotalWithShipping = serverVerification.totalAmount + selectedRate.price;

      const draft: VerifiedCheckoutDraft = {
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        buyer: validation.sanitizedData,
        items: serverVerification.items,
        totalQuantity,
        totalWeightGrams,
        subtotalAmount: serverVerification.totalAmount,
        selectedShippingRate: selectedRate,
        shippingCost: selectedRate.price,
        totalAmount: verifiedTotalWithShipping,
        destinationAreaId: resolvedDestinationAreaId,
        shippingIncluded: true,
        verifiedAt: new Date().toISOString(),
      };

      saveVerifiedCheckoutDraft(draft);
      setVerifiedDraft(draft);
    } catch {
      setSubmitError('Terjadi gangguan koneksi saat memverifikasi pesanan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tampilan saat hidrasi awal
  if (!hydrated) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
        <div className='text-center space-y-2'>
          <div className='w-7 h-7 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto' />
          <p className='text-xs font-medium text-gray-500'>Memuat ringkasan pesanan...</p>
        </div>
      </div>
    );
  }

  // Tampilan jika keranjang kosong
  if (cartSummary.items.length === 0) {
    return (
      <div className='min-h-screen bg-gray-50 flex flex-col'>
        <header className='sticky top-0 z-30 bg-white border-b border-gray-200'>
          <div className='max-w-lg mx-auto px-4 h-14 flex items-center justify-between'>
            <Link href={`/${store.slug}`} className='inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-700 transition'>
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.2} d='M15 19l-7-7 7-7' />
              </svg>
              <span>Kembali ke Katalog</span>
            </Link>
            <span className='text-xs font-bold text-gray-500 truncate max-w-[160px]'>{store.name}</span>
          </div>
        </header>

        <main className='flex-1 max-w-lg w-full mx-auto p-4 flex items-center justify-center'>
          <div className='w-full bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm space-y-3'>
            <h1 className='text-base font-extrabold text-gray-900'>Keranjang Belanja Kosong</h1>
            <p className='text-xs text-gray-500 leading-relaxed'>
              Pilih minimal satu produk dari katalog <strong className='text-gray-700'>{store.name}</strong> sebelum mengisi data pengiriman.
            </p>
            <div className='pt-2'>
              <Link href={`/${store.slug}`} className='inline-flex items-center justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition'>
                Kembali ke Katalog
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      {/* Header Navigasi Atas dengan Tombol Kembali ke Katalog */}
      <header className='sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200'>
        <div className='max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-2'>
          <Link href={`/${store.slug}`} className='inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-700 py-1.5 px-2 -ml-2 rounded-lg hover:bg-gray-100 transition'>
            <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.2} d='M15 19l-7-7 7-7' />
            </svg>
            <span>Kembali ke Katalog</span>
          </Link>

          <span className='text-xs font-extrabold text-emerald-700 truncate max-w-[170px]'>{store.name}</span>
        </div>
      </header>

      {/* Konten Utama Mobile-First */}
      <main className='flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-12 space-y-4'>
        <div>
          <h1 className='text-lg font-extrabold text-gray-900'>Checkout & Data Pengiriman</h1>
          <p className='text-xs text-gray-500 mt-0.5'>Lengkapi alamat tujuan untuk melihat tarif ongkos kirim secara otomatis.</p>
        </div>

        {stockNotice && (
          <div role='alert' className='bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs leading-relaxed'>
            {stockNotice}
          </div>
        )}

        {/* ================= BAGIAN 1: FORMULIR DATA PENGIRIMAN ================= */}
        <section aria-label='Formulir Data Pengiriman' className='bg-white rounded-2xl border border-gray-200 p-4 shadow-sm'>
          <div className='flex items-center justify-between gap-2 mb-3.5'>
            <h2 className='text-sm font-extrabold text-gray-900'>Data Penerima & Alamat Pengiriman</h2>
            {hasStoredProfile && (
              <button type='button' onClick={handleForgetSavedData} className='text-[11px] font-semibold text-rose-600 hover:underline shrink-0'>
                Hapus data tersimpan
              </button>
            )}
          </div>

          <form id='checkout-form' onSubmit={handleSubmitCheckout} noValidate className='space-y-3.5'>
            {/* 1. Nama Lengkap */}
            <div>
              <label htmlFor='buyer-fullname' className='block text-xs font-bold text-gray-700 mb-1'>
                Nama Lengkap <span className='text-rose-600'>*</span>
              </label>
              <input
                id='buyer-fullname'
                type='text'
                autoComplete='name'
                maxLength={100}
                value={formData.fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                placeholder='Contoh: Budi Santoso'
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.fullName ? 'border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20' : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.fullName && <p className='text-[11px] font-medium text-rose-600 mt-1'>{fieldErrors.fullName}</p>}
            </div>

            {/* 2. Nomor WhatsApp */}
            <div>
              <label htmlFor='buyer-whatsapp' className='block text-xs font-bold text-gray-700 mb-1'>
                Nomor WhatsApp Aktif <span className='text-rose-600'>*</span>
              </label>
              <input
                id='buyer-whatsapp'
                type='tel'
                inputMode='tel'
                autoComplete='tel'
                maxLength={20}
                value={formData.whatsappNumber}
                onChange={(e) => handleFieldChange('whatsappNumber', e.target.value)}
                placeholder='Contoh: 081234567890'
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.whatsappNumber ? 'border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20' : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.whatsappNumber && <p className='text-[11px] font-medium text-rose-600 mt-1'>{fieldErrors.whatsappNumber}</p>}
            </div>

            {/* 3. Alamat Lengkap */}
            <div>
              <label htmlFor='buyer-address' className='block text-xs font-bold text-gray-700 mb-1'>
                Alamat Lengkap <span className='text-rose-600'>*</span>
              </label>
              <textarea
                id='buyer-address'
                rows={3}
                autoComplete='street-address'
                maxLength={300}
                value={formData.fullAddress}
                onChange={(e) => handleFieldChange('fullAddress', e.target.value)}
                placeholder='Nama jalan, nomor rumah, RT/RW, kelurahan/desa, atau patokan lokasi'
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.fullAddress ? 'border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20' : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.fullAddress && <p className='text-[11px] font-medium text-rose-600 mt-1'>{fieldErrors.fullAddress}</p>}
            </div>

            {/* 4. Kecamatan */}
            <div>
              <label htmlFor='buyer-district' className='block text-xs font-bold text-gray-700 mb-1'>
                Kecamatan <span className='text-rose-600'>*</span>
              </label>
              <input
                id='buyer-district'
                type='text'
                maxLength={100}
                value={formData.district}
                onChange={(e) => handleFieldChange('district', e.target.value)}
                placeholder='Contoh: Pancoran'
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.district ? 'border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20' : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.district && <p className='text-[11px] font-medium text-rose-600 mt-1'>{fieldErrors.district}</p>}
            </div>

            {/* 5. Kota atau Kabupaten */}
            <div>
              <label htmlFor='buyer-city' className='block text-xs font-bold text-gray-700 mb-1'>
                Kota / Kabupaten <span className='text-rose-600'>*</span>
              </label>
              <input
                id='buyer-city'
                type='text'
                autoComplete='address-level2'
                maxLength={100}
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder='Contoh: Jakarta Selatan'
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.city ? 'border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20' : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.city && <p className='text-[11px] font-medium text-rose-600 mt-1'>{fieldErrors.city}</p>}
            </div>

            {/* 6. Provinsi (Opsional) */}
            <div>
              <label htmlFor='buyer-province' className='block text-xs font-bold text-gray-700 mb-1'>
                Provinsi <span className='text-gray-400 font-normal'>(Opsional)</span>
              </label>
              <input
                id='buyer-province'
                type='text'
                autoComplete='address-level1'
                maxLength={100}
                value={formData.province}
                onChange={(e) => handleFieldChange('province', e.target.value)}
                placeholder='Contoh: DKI Jakarta'
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base sm:text-sm outline-none transition ${
                  fieldErrors.province ? 'border-rose-500 bg-rose-50/40 focus:ring-2 focus:ring-rose-500/20' : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.province && <p className='text-[11px] font-medium text-rose-600 mt-1'>{fieldErrors.province}</p>}
            </div>

            {/* Kotak Persetujuan Penyimpanan Data Pembeli di Browser */}
            <div className='p-3 rounded-xl bg-gray-50 border border-gray-200'>
              <label className='flex items-start gap-2.5 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  checked={rememberBuyerData}
                  onChange={(e) => handleToggleConsent(e.target.checked)}
                  className='mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500'
                />
                <span className='text-xs text-gray-700 leading-relaxed'>
                  <strong>Simpan data pengiriman di browser ini</strong> agar otomatis terisi saat saya berbelanja lagi. Data hanya disimpan di perangkat Anda.
                </span>
              </label>
            </div>
          </form>
        </section>

        {/* ================= BAGIAN 2: PILIHAN KURIR PENGIRIMAN ================= */}
        <section aria-label='Pilihan Kurir Pengiriman' className='bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <div>
              <h2 className='text-sm font-extrabold text-gray-900'>Pilih Kurir Pengiriman</h2>
              <p className='text-[11px] text-gray-500 mt-0.5'>
                Dikirim dari <strong>{store.city}</strong> • Estimasi berat <strong>{totalWeightGrams} gr</strong>
              </p>
            </div>

            {formData.district.trim().length >= 3 && formData.city.trim().length >= 3 && (
              <button
                type='button'
                disabled={loadingRates}
                onClick={() => fetchRatesForAddress(formData.district, formData.city, formData.province)}
                className='text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 px-2.5 py-1.5 rounded-xl transition shrink-0'
              >
                {loadingRates ? 'Mengecek...' : 'Refresh Ongkir'}
              </button>
            )}
          </div>

          {formData.district.trim().length < 3 || formData.city.trim().length < 3 ? (
            <div className='p-3.5 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-600 leading-relaxed'>
              Isi <strong>Kecamatan</strong> dan <strong>Kota / Kabupaten</strong> di atas untuk melihat daftar kurir dan tarif ongkos kirim secara real-time.
            </div>
          ) : (
            <ShippingSelector
              shippingRates={shippingRates}
              selectedRate={selectedRate}
              onSelectRate={(rate) => {
                setSelectedRate(rate);
                if (submitError) setSubmitError(null);
              }}
              isLoading={loadingRates}
              error={ratesError}
              errorStage={ratesErrorStage}
              onRetry={() => fetchRatesForAddress(formData.district, formData.city, formData.province)}
            />
          )}
        </section>

        {/* ================= BAGIAN 3: RINGKASAN PESANAN & TOTAL AKHIR ================= */}
        <section aria-label='Ringkasan Pesanan' className='bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3'>
          <div className='flex items-center justify-between border-b border-gray-100 pb-2.5'>
            <h2 className='text-sm font-extrabold text-gray-900'>Ringkasan Pesanan</h2>
            <span className='text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full'>{cartSummary.totalItems} Barang</span>
          </div>

          {/* Daftar Barang */}
          <ul className='divide-y divide-gray-100'>
            {cartSummary.items.map((item) => (
              <li key={item.productId} className='py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3'>
                <div className='flex items-start gap-2.5 min-w-0 flex-1'>
                  <div className='w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0'>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className='w-full h-full object-cover' />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-[9px] text-gray-400 text-center px-0.5'>Produk</div>
                    )}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <p className='text-xs font-bold text-gray-900 line-clamp-2 leading-snug'>{item.name}</p>
                    <p className='text-[11px] text-gray-500 mt-0.5'>
                      {item.quantity} × {formatRupiah(item.price)}
                    </p>
                  </div>
                </div>

                <span className='text-xs font-extrabold text-gray-900 shrink-0'>{formatRupiah(item.subtotal)}</span>
              </li>
            ))}
          </ul>

          {/* Rincian Subtotal, Ongkir, & Total Akhir */}
          <div className='pt-3 border-t border-gray-200 space-y-2 text-xs'>
            <div className='flex items-center justify-between text-gray-600'>
              <span>Subtotal Barang ({cartSummary.totalItems} barang)</span>
              <span className='font-bold text-gray-900'>{formatRupiah(cartSummary.subtotalAmount)}</span>
            </div>

            <div className='flex items-center justify-between text-gray-600'>
              <span className='truncate pr-2'>
                Ongkos Kirim
                {selectedRate ? ` (${selectedRate.courier_name} ${selectedRate.service_name})` : ''}
              </span>
              <span className='font-bold text-gray-900 shrink-0'>{selectedRate ? formatRupiah(shippingCost) : 'Pilih kurir dahulu'}</span>
            </div>

            <div className='flex items-center justify-between text-sm pt-2 border-t border-dashed border-gray-200'>
              <span className='font-extrabold text-gray-900'>Total Akhir</span>
              <span className='text-base font-extrabold text-emerald-700'>{formatRupiah(finalTotalAmount)}</span>
            </div>
          </div>

          {submitError && (
            <div role='alert' className='p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium leading-relaxed'>
              {submitError}
            </div>
          )}

          {verifiedDraft && (
            <div role='status' className='p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1.5'>
              <p className='font-extrabold text-emerald-800'>✓ Data pengiriman, kurir, & total pesanan terverifikasi</p>
              <p>
                Penerima: <strong>{verifiedDraft.buyer.fullName}</strong> ({verifiedDraft.buyer.whatsappNumber})
              </p>
              {verifiedDraft.selectedShippingRate && (
                <p>
                  Kurir:{' '}
                  <strong>
                    {verifiedDraft.selectedShippingRate.courier_name} {verifiedDraft.selectedShippingRate.service_name}
                  </strong>{' '}
                  ({formatRupiah(verifiedDraft.shippingCost)})
                </p>
              )}
              <p className='font-bold pt-1'>Total Akhir: {formatRupiah(verifiedDraft.totalAmount)}</p>
            </div>
          )}

          {/* Tombol Aksi Utama & Kembali ke Katalog */}
          <div className='pt-2 space-y-2.5'>
            <button
              type='submit'
              form='checkout-form'
              disabled={submitting || loadingRates}
              className='w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white text-sm font-extrabold rounded-2xl shadow-sm transition'
            >
              {submitting ? 'Memverifikasi Pesanan...' : 'Simpan & Konfirmasi Pesanan'}
            </button>

            <Link
              href={`/${store.slug}`}
              className='flex items-center justify-center w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold rounded-2xl transition'
            >
              Kembali ke Katalog
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
