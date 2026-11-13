"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatRupiahInput,
  parseRupiahToNumber,
  validateProductInput,
} from "@/lib/product-validators";
import { saveProduct, removeOrphanedUpload, ProductRecord } from "@/actions/product";
import ProductImageUploader from "@/components/ProductImageUploader";

interface ProductFormProps {
  userId: string;
  initialData?: ProductRecord | null;
}

export default function ProductForm({ userId, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(initialData?.id);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageUrl, setImageUrl] = useState<string>(initialData?.image_url || "");
  const [name, setName] = useState<string>(initialData?.name || "");
  const [priceFormatted, setPriceFormatted] = useState<string>(
    initialData?.price ? formatRupiahInput(initialData.price) : ""
  );
  const [description, setDescription] = useState<string>(initialData?.description || "");
  const [isAvailable, setIsAvailable] = useState<boolean>(
    initialData ? initialData.is_available : true
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const handleCancel = async () => {
    // Jika pengguna sempat upload foto baru lalu menekan Batal, hapus file yatim di storage
    if (imageUrl && imageUrl !== initialData?.image_url) {
      await removeOrphanedUpload(imageUrl);
    }
    router.back();
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      const numericPrice = parseRupiahToNumber(priceFormatted);
      const check = validateProductInput({ name, price: numericPrice });
      if (!check.isValid) {
        setError(check.error || "Periksa kembali nama dan harga produk.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numericPrice = parseRupiahToNumber(priceFormatted);
    const check = validateProductInput({
      name,
      price: numericPrice,
      description,
    });

    if (!check.isValid) {
      setError(check.error || "Data produk belum valid.");
      return;
    }

    setSaving(true);
    try {
      await saveProduct(
        {
          name,
          price: numericPrice,
          description,
          image_url: imageUrl || null,
          is_available: isAvailable,
        },
        initialData?.id
      );

      router.push("/dashboard/products");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan produk.";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-gray-900">
            {isEditMode ? "Edit Produk" : "Tambah Produk Baru"}
          </h1>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            Langkah {step} dari 3
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => {
                if (num < step || isEditMode) {
                  setError("");
                  setStep(num as 1 | 2 | 3);
                }
              }}
              className={`h-1.5 rounded-full transition-colors ${
                num <= step ? "bg-emerald-600" : "bg-gray-200"
              }`}
              aria-label={`Langkah ${num}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">1. Foto Produk</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ambil foto produk dari kamera HP atau pilih foto dari galeri.
              </p>
            </div>

            <ProductImageUploader
              userId={userId}
              currentImageUrl={imageUrl}
              savedImageUrl={initialData?.image_url}
              onUploaded={(url) => setImageUrl(url)}
              onUploadingChange={setUploadingImage}
            />

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                disabled={uploadingImage}
                onClick={handleCancel}
                className="w-1/3 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={uploadingImage}
                onClick={handleNextStep}
                className="w-2/3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
              >
                {imageUrl ? "Lanjut: Nama & Harga" : "Lewati Foto & Lanjut"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">2. Nama & Harga Produk</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Masukkan nama produk dan harga satuan dalam Rupiah.
              </p>
            </div>

            <div>
              <label htmlFor="product-name" className="block text-xs font-semibold text-gray-700 mb-1">
                Nama Produk *
              </label>
              <input
                id="product-name"
                type="text"
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Sambal Roa Kemasan Botol 150gr"
                className="w-full px-3.5 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="product-price" className="block text-xs font-semibold text-gray-700 mb-1">
                Harga Satuan (Rupiah) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-gray-500">Rp</span>
                <input
                  id="product-price"
                  type="text"
                  inputMode="numeric"
                  value={priceFormatted}
                  onChange={(e) => setPriceFormatted(formatRupiahInput(e.target.value))}
                  placeholder="25.000"
                  className="w-full pl-10 pr-3.5 py-3 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                className="w-1/3 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-2/3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Lanjut: Deskripsi & Stok
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">3. Deskripsi & Status Stok</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Periksa ringkasan produk dan atur ketersediaannya.
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200 bg-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 shrink-0">
                  Tanpa Foto
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                <p className="text-xs font-semibold text-emerald-700">
                  Rp {priceFormatted || "0"}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="product-desc" className="block text-xs font-semibold text-gray-700 mb-1">
                Deskripsi Singkat (Opsional)
              </label>
              <textarea
                id="product-desc"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Pedas gurih, tahan hingga 2 minggu di suhu ruang."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-700 mb-2">
                Status Ketersediaan
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAvailable(true)}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isAvailable
                      ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                      : "bg-white border-gray-200 text-gray-600"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Tersedia (Ada)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAvailable(false)}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    !isAvailable
                      ? "bg-rose-50 border-rose-600 text-rose-800"
                      : "bg-white border-gray-200 text-gray-600"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Stok Habis</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setError("");
                  setStep(2);
                }}
                className="w-1/3 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-2/3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition"
              >
                {saving
                  ? "Menyimpan..."
                  : isEditMode
                  ? "Simpan Perubahan"
                  : "Simpan & Publikasikan"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}