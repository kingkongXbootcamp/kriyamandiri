"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SellerDashboardPayload } from "@/actions/dashboard";

export default function SellerDashboard({ data }: { data: SellerDashboardPayload }) {
  const [copied, setCopied] = useState(false);
  const { store, stats } = data;

  // Arahkan penjual melengkapi profil toko jika belum terdaftar
  if (!store) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm mt-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Profil Toko Belum Dibuat</h2>
        <p className="text-sm text-gray-500 mb-5">
          Lengkapi nama toko dan nomor WhatsApp Anda terlebih dahulu agar katalog online dapat digunakan.
        </p>
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center justify-center w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition"
        >
          Lengkapi Profil Toko
        </Link>
      </div>
    );
  }

  const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "kriyamandiri.id";
  const cleanDomain = baseDomain.replace(/^https?:\/\//, "");
  const publicStoreUrl = `https://${cleanDomain}/${store.slug}`;

  const handleCopyOrShare = async () => {
    const shareText = `Halo! Silakan lihat katalog produk *${store.name}* dan pesan langsung lewat WhatsApp di sini:\n${publicStoreUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Katalog ${store.name}`,
          text: shareText,
          url: publicStoreUrl,
        });
        return;
      } catch {
        // Lanjut ke fallback copy clipboard jika pengguna menutup dialog share
      }
    }

    try {
      await navigator.clipboard.writeText(publicStoreUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(`Salin tautan toko Anda: ${publicStoreUrl}`);
    }
  };

  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(
    `Halo! Cek katalog produk *${store.name}* dan pesan langsung lewat WhatsApp di sini: ${publicStoreUrl}`
  )}`;

  return (
    <div className="space-y-4">
      {/* 1. Kartu Identitas Toko */}
      <section className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={`Logo ${store.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              store.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">{store.name}</h1>
            <p className="text-xs text-gray-500 truncate mt-0.5">{store.city}</p>
            <p className="text-xs font-mono text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded mt-1.5 truncate max-w-full">
              {cleanDomain}/{store.slug}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Ringkasan Statistik Produk Riil */}
      <section aria-label="Statistik Produk">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs font-medium text-gray-500">Jumlah Produk</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">
              {stats.totalProducts}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs font-medium text-emerald-700">Produk Aktif</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {stats.activeProducts}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs font-medium text-rose-600">Produk Habis</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">
              {stats.outOfStockProducts}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Tombol Aksi Utama: Tambah Produk */}
      <section>
        <Link
          href="/dashboard/products/new"
          className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-2xl shadow-sm transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Produk</span>
        </Link>
      </section>

      {/* 4. Tombol Aksi Katalog & Bagikan Link */}
      <section className="grid grid-cols-2 gap-2.5">
        <a
          href={`/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-semibold text-xs rounded-2xl shadow-sm transition"
        >
          <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>Lihat Katalog</span>
        </a>

        <button
          type="button"
          onClick={handleCopyOrShare}
          className="flex items-center justify-center gap-2 py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-2xl shadow-sm transition"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>{copied ? "Link Tersalin!" : "Bagikan Link Toko"}</span>
        </button>
      </section>

      {/* 5. Kartu Tautan Cepat Sebar ke WhatsApp */}
      <section className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Tautan Katalog Toko Anda
          </h2>
          <p className="text-sm font-mono text-gray-800 break-all mt-1 select-all">
            {publicStoreUrl}
          </p>
        </div>

        <a
          href={whatsappShareHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl transition"
        >
          <span>Bagikan Langsung via WhatsApp</span>
        </a>
      </section>

      {/* 6. Informasi Status Katalog Kosong (Hanya tampil jika data produk = 0) */}
      {stats.totalProducts === 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-amber-900">Belum ada produk di katalog</h3>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Tambahkan foto, nama, dan harga produk pertama Anda sekarang agar pembeli bisa mulai memesan melalui WhatsApp.
          </p>
        </section>
      )}
    </div>
  );
}