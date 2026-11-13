const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_RAW_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB batas file mentah dari kamera HP

export interface CompressionResult {
  file: File;
  originalSizeKB: number;
  compressedSizeKB: number;
}

export function validateRawImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Format gambar tidak didukung. Gunakan foto berformat JPG, PNG, atau WebP.",
    };
  }

  if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Ukuran file terlalu besar (maksimal 8 MB).",
    };
  }

  return { valid: true };
}

export async function compressProductImage(
  file: File,
  maxDimension = 800,
  quality = 0.78
): Promise<CompressionResult> {
  const validation = validateRawImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const originalSizeKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Skala proporsional agar sisi terpanjang maksimal 800px
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Perangkat tidak mendukung pemrosesan gambar."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Gagal mengompresi foto produk."));
              return;
            }

            const safeBaseName = file.name
              .replace(/\.[^/.]+$/, "")
              .replace(/[^a-zA-Z0-9-_]/g, "")
              .slice(0, 30) || "produk";

            const compressedFile = new File(
              [blob],
              `${Date.now()}-${safeBaseName}.webp`,
              { type: "image/webp" }
            );

            resolve({
              file: compressedFile,
              originalSizeKB,
              compressedSizeKB: Math.max(1, Math.round(compressedFile.size / 1024)),
            });
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => reject(new Error("File gambar rusak atau tidak dapat dibaca."));
    };

    reader.onerror = () => reject(new Error("Gagal membaca file dari perangkat."));
  });
}

// Mengekstrak path relatif di dalam bucket 'product-images' secara aman
export function extractOwnedStoragePath(
  publicUrl: string | null | undefined,
  userId: string
): string | null {
  if (!publicUrl) return null;

  const marker = "/storage/v1/object/public/product-images/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const relativePath = decodeURIComponent(publicUrl.slice(markerIndex + marker.length));

  // Pastikan path diawali folder userId pemilik untuk keamanan ganda
  if (!relativePath.startsWith(`${userId}/`)) {
    return null;
  }

  return relativePath;
}