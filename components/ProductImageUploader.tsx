"use client";

import React, { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressProductImage } from "@/lib/image-compressor";
import { removeOrphanedUpload } from "@/actions/product";

interface ProductImageUploaderProps {
  userId: string;
  currentImageUrl: string;
  savedImageUrl?: string | null; // Foto yang sudah tersimpan di DB (jangan dihapus sebelum Simpan)
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
    // Reset value input agar file yang sama bisa dipilih ulang jika perlu
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
          cacheControl: "31536000", // Cache CDN 1 tahun untuk hemat bandwidth
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      // Jika sebelumnya sudah ada upload sementara yang belum disimpan ke DB, bersihkan
      if (currentImageUrl && currentImageUrl !== savedImageUrl) {
        await removeOrphanedUpload(currentImageUrl);
      }

      setCompressionInfo(
        `Foto dioptimalkan: ${originalSizeKB} KB → ${compressedSizeKB} KB (WebP)`
      );
      onUploaded(publicUrlData.publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah foto produk.";
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
      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 bg-gray-50 flex flex-col items-center justify-center min-h-[210px]">
        {uploading ? (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
            <p className="text-xs font-bold text-gray-800">Mengompres & mengunggah foto...</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Otomatis memperkecil ukuran agar hemat kuota
            </p>
          </div>
        ) : currentImageUrl ? (
          <div className="w-full text-center space-y-2.5">
            <img
              src={currentImageUrl}
              alt="Foto produk"
              className="w-44 h-44 object-cover rounded-xl mx-auto border border-gray-200 shadow-sm bg-white"
            />
            {compressionInfo && (
              <p className="text-[11px] font-medium text-emerald-700 bg-emerald-50 inline-block px-2.5 py-0.5 rounded-full">
                {compressionInfo}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Belum ada foto produk</p>
            <p className="text-xs text-gray-500 mt-1">
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
          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Ambil Kamera</span>
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-xl transition disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span>Pilih dari Galeri</span>
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
}