"use client";

import React, { useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  ImageOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressProductImage } from "@/lib/image-compressor";
import { removeOrphanedUpload } from "@/actions/product";

interface ProductImageUploaderProps {
  userId: string;
  currentImageUrl: string;
  savedImageUrl?: string | null;
  onUploaded: (newUrl: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

export default function ProductImageUploader({
  userId,
  currentImageUrl,
  savedImageUrl,
  onUploaded,
  onUploadingChange,
}: ProductImageUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [compressionInfo, setCompressionInfo] = useState("");

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setCompressionInfo("");
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const { file: compressedFile, originalSizeKB, compressedSizeKB } =
        await compressProductImage(file);

      const supabase = createClient();
      const filePath = `${userId}/${compressedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, compressedFile, {
          cacheControl: "31536000",
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (currentImageUrl && currentImageUrl !== savedImageUrl) {
        await removeOrphanedUpload(currentImageUrl);
      }

      setCompressionInfo(
        `Foto dioptimalkan: ${originalSizeKB} KB → ${compressedSizeKB} KB (WebP)`
      );
      onUploaded(publicUrlData.publicUrl);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal mengunggah foto produk.";
      setError(msg);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input Tersembunyi: Kamera Langsung */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Input Tersembunyi: Galeri HP / File */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Area Pratinjau Foto */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4">
        {uploading ? (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-2.5 text-xs font-bold text-slate-800">
              Mengompres &amp; mengunggah foto...
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Otomatis diperkecil agar hemat kuota &amp; cepat dibuka
            </p>
          </div>
        ) : currentImageUrl ? (
          <div className="w-full space-y-2.5 text-center">
            <img
              src={currentImageUrl}
              alt="Pratinjau foto produk"
              className="mx-auto h-44 w-44 rounded-2xl border border-slate-200 bg-white object-cover shadow-xs"
            />
            {compressionInfo && (
              <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{compressionInfo}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ImageOff className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">
              Belum ada foto produk
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Format JPG, PNG, atau WebP (Maks. 8 MB)
            </p>
          </div>
        )}
      </div>

      {/* Dua Tombol Eksplisit: Kamera HP & Galeri HP */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={uploading}
          onClick={() => cameraInputRef.current?.click()}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50"
        >
          <Camera className="h-4 w-4 shrink-0" />
          <span>Ambil Kamera</span>
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={() => galleryInputRef.current?.click()}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4 shrink-0" />
          <span>Pilih Galeri</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}