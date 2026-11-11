"use client";

import React, { useState, useEffect } from "react";
import { generateSlug, isValidSlug, sanitizeAndValidateWhatsApp } from "@/lib/validators";
import { saveStoreProfile } from "@/actions/store";

interface StoreData {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  whatsapp_number: string;
  city: string;
  logo_url?: string;
}

export default function StoreProfileForm({ initialData }: { initialData?: StoreData | null }) {
  const [formData, setFormData] = useState<StoreData>({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    whatsapp_number: initialData?.whatsapp_number || "",
    city: initialData?.city || "",
    logo_url: initialData?.logo_url || "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const domain = process.env.NEXT_PUBLIC_APP_URL || "kriyamandiri.id";
  const publicStoreUrl = `${domain}/${formData.slug || "nama-toko"}`;

  // Auto-generate slug hanya saat pertama kali membuat toko jika slug belum diedit manual
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!initialData?.id) {
      setFormData((prev) => ({
        ...prev,
        name,
        slug: generateSlug(name),
      }));
    } else {
      setFormData((prev) => ({ ...prev, name }));
    }
  };

  const handleCopyLink = () => {
    if (!formData.slug) return;
    navigator.clipboard.writeText(`https://${publicStoreUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Validasi lokal cepat
    if (!isValidSlug(formData.slug)) {
      setErrorMessage("Slug hanya boleh menggunakan huruf kecil, angka, dan tanda strip (-).");
      return;
    }

    const wa = sanitizeAndValidateWhatsApp(formData.whatsapp_number);
    if (!wa.isValid) {
      setErrorMessage("Nomor WhatsApp tidak valid. Masukkan nomor aktif Anda.");
      return;
    }

    setLoading(true);

    try {
      await saveStoreProfile(
        {
          ...formData,
          whatsapp_number: wa.formatted,
        },
        initialData?.id
      );

      setSuccessMessage(initialData?.id ? "Profil toko berhasil diperbarui!" : "Pendaftaran toko berhasil!");
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan data toko.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {initialData?.id ? "Pengaturan Profil Toko" : "Daftarkan Toko Anda"}
        </h1>
        <p className="text-sm text-gray-500">
          Lengkapi data toko Anda agar pembeli dapat langsung memesan melalui WhatsApp.
        </p>
      </div>

      {/* Box Tampilan Tautan Publik Toko */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <label className="block text-xs font-semibold text-blue-800 mb-1">
          LINK TOKO KATALOG ANDA
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-mono text-blue-900 truncate">
            https://{publicStoreUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!formData.slug}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition shrink-0"
          >
            {copied ? "Tersalin!" : "Salin Link"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Toko */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Toko *
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={formData.name}
            onChange={handleNameChange}
            placeholder="Contoh: Kemeja Flanel Store"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>

        {/* Slug / Tautan Toko */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug / Tautan Toko Unik *
          </label>
          <div className="flex rounded-lg shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              {domain}/
            </span>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })}
              placeholder="nama-toko"
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Hanya huruf kecil, angka, dan tanda minus.</p>
        </div>

        {/* Nomor WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nomor WhatsApp Penjual *
          </label>
          <input
            type="tel"
            required
            value={formData.whatsapp_number}
            onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
            placeholder="Contoh: 081234567890"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Pesanan dari pembeli di katalog akan langsung dikirimkan ke nomor ini via WhatsApp.
          </p>
        </div>

        {/* Kota / Lokasi Toko */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kota / Lokasi Toko *
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Contoh: Kota Bogor"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>

        {/* Deskripsi Toko */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deskripsi Singkat (Opsional)
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Contoh: Buka jam 09:00 - 17:00. Menyediakan busana pria kasual berkualitas."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>

        {/* Logo Toko (URL) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL Logo Toko (Opsional)
          </label>
          <input
            type="url"
            value={formData.logo_url}
            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            placeholder="https://domain.com/logo.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>

        {/* Tombol Simpan */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-50"
          >
            {loading ? "Menyimpan Data..." : initialData?.id ? "Simpan Perubahan" : "Daftarkan Toko"}
          </button>
        </div>
      </form>
    </div>
  );
}