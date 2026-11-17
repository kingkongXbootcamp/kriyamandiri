"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ImageOff } from "lucide-react";
import {
  formatRupiahInput,
  parseRupiahToNumber,
  validateProductInput,
} from "@/lib/product-validators";
import {
  saveProduct,
  removeOrphanedUpload,
  ProductRecord,
} from "@/actions/product";
import ProductImageUploader from "@/components/ProductImageUploader";

interface ProductFormProps {
  userId: string;
  initialData?: ProductRecord | null;
}

const STEP_LABELS = [
  { num: 1 as const, label: "Foto" },
  { num: 2 as const, label: "Nama & Harga" },
  { num: 3 as const, label: "Stok & Simpan" },
];

export default function ProductForm({ userId, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(initialData?.id);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageUrl, setImageUrl] = useState<string>(initialData?.image_url || "");
  const [name, setName] = useState<string>(initialData?.name || "");
  const [priceFormatted, setPriceFormatted] = useState<string>(
    initialData?.price ? formatRupiahInput(initialData.price) : ""
  );
  const [description, setDescription] = useState<string>(
    initialData?.description || ""
  );
  const [isAvailable, setIsAvailable] = useState<boolean>(
    initialData ? initialData.is_available : true
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const handleCancel = async () => {
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
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan produk.";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header & Indikator 3 Langkah */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-base font-extrabold text-slate-900 sm:text-lg">
            {isEditMode ? "Edit Produk" : "Tambah Produk Baru"}
          </h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            Langkah {step} / 3
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {STEP_LABELS.map((item) => {
            const isCompleted = item.num < step;
            const isCurrent = item.num === step;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => {
                  if (item.num < step || isEditMode) {
                    setError("");
                    setStep(item.num);
                  }
                }}
                aria-label={`Langkah ${item.num}: ${item.label}`}
                className="flex flex-col items-start gap-1.5 text-left"
              >
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    item.num <= step ? "bg-emerald-600" : "bg-slate-200"
                  }`}
                />
                <span
                  className={`flex items-center gap-1 text-[11px] font-bold ${
                    isCurrent
                      ? "text-emerald-700"
                      : isCompleted
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  {isCompleted && <Check className="h-3 w-3 text-emerald-600" />}
                  <span>
                    {item.num}. {item.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 sm:mx-5"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 sm:p-5">
        {/* LANGKAH 1: FOTO PRODUK */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                1. Foto Produk
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Ambil foto langsung dari kamera HP atau pilih foto dari galeri.
              </p>
            </div>

            <ProductImageUploader
              userId={userId}
              currentImageUrl={imageUrl}
              savedImageUrl={initialData?.image_url}
              onUploaded={(url) => setImageUrl(url)}
              onUploadingChange={setUploadingImage}
            />

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={uploadingImage}
                onClick={handleCancel}
                className="min-h-[48px] w-1/3 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={uploadingImage}
                onClick={handleNextStep}
                className="min-h-[48px] w-2/3 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                {imageUrl ? "Lanjut: Nama & Harga" : "Lewati Foto & Lanjut"}
              </button>
            </div>
          </div>
        )}

        {/* LANGKAH 2: NAMA & HARGA */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                2. Nama & Harga Produk
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Masukkan nama produk yang jelas dan harga satuan dalam Rupiah.
              </p>
            </div>

            <div>
              <label
                htmlFor="product-name"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                Nama Produk <span className="text-rose-600">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Sambal Roa Kemasan Botol 150gr"
                className="h-12 w-full rounded-xl border border-slate-300 px-3.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="product-price"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                Harga Satuan (Rupiah) <span className="text-rose-600">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-sm font-extrabold text-slate-500">
                  Rp
                </span>
                <input
                  id="product-price"
                  type="text"
                  inputMode="numeric"
                  value={priceFormatted}
                  onChange={(e) =>
                    setPriceFormatted(formatRupiahInput(e.target.value))
                  }
                  placeholder="25.000"
                  className="h-12 w-full rounded-xl border border-slate-300 pl-10 pr-3.5 text-base font-bold text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                className="min-h-[48px] w-1/3 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="min-h-[48px] w-2/3 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                Lanjut: Deskripsi & Stok
              </button>
            </div>
          </div>
        )}

        {/* LANGKAH 3: DESKRIPSI & STATUS STOK */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                3. Deskripsi & Status Stok
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Periksa ringkasan produk dan tentukan ketersediaan stok.
              </p>
            </div>

            {/* Kartu Pratinjau Produk */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-white object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-200 text-[10px] text-slate-500">
                  <ImageOff className="h-4 w-4" />
                  <span>No Foto</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {name}
                </p>
                <p className="mt-0.5 text-xs font-extrabold text-emerald-700">
                  Rp {priceFormatted || "0"}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="product-desc"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                Deskripsi Singkat{" "}
                <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <textarea
                id="product-desc"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Pedas gurih, kemasan botol segel 150gr."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-bold text-slate-700">
                Status Ketersediaan
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAvailable(true)}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                    isAvailable
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Tersedia (Ada)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAvailable(false)}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                    !isAvailable
                      ? "border-rose-600 bg-rose-50 text-rose-800 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Stok Habis</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setError("");
                  setStep(2);
                }}
                className="min-h-[48px] w-1/3 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[48px] w-2/3 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
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