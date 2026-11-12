"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DashboardData } from "@/actions/dashboard";

export default function DashboardView({ data }: { data: DashboardData }) {
  const [copied, setCopied] = useState(false);
  const { store, stats } = data;

  if (!store) {
    return (
      <div className="p-6 text-center max-w-md mx-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Toko Belum Terdaftar</h2>
        <p className="text-sm text-gray-600 mb-6">
          Anda perlu melengkapi profil toko terlebih dahulu untuk membuka katalog online Anda.
        </p>
        <Link
          href="/dashboard/settings"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
        >
          Buat Toko Sekarang
        </Link>
      </div>
    );
  }

  const catalogUrl = `https://${process.env.NEXT_PUBLIC_APP_URL || "kriyamandiri.id"}/${store.slug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Katalog Resmi ${store.name}`,
          text: `Halo! Cek katalog produk dan pesan langsung via WhatsApp di tautan resmi kami:`,
          url: catalogUrl,
        });
      } catch (err) {
        // User membatalkan dialog share
      }
    } else {
      navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5 pb-20 sm:pb-6">
      {/* 1. Header Profil Ringkas */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3 truncate">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border border-emerald-200">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              store.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="truncate">
            <h1 className="text-base font-bold text-gray-900 truncate">{store.name}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>📍 {store.city}</span>
              <span>•</span>
              <span className="font-mono text-emerald-700">/{store.slug}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Kartu Statistik Riil Produk */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
          <span className="text-[11px] font-medium text-gray-500 block leading-tight">Total Produk</span>
          <span className="text-xl font-bold text-gray-900 mt-1 block">
            {stats.totalProducts}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
          <span className="text-[11px] font-medium text-emerald-600 block leading-tight">Produk Aktif</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">
            {stats.activeProducts}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
          <span className="text-[11px] font-medium text-rose-500 block leading-tight">Produk Habis</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">
            {stats.outOfStockProducts}
          </span>
        </div>
      </div>

      {/* 3. Aksi Utama: Tambah Produk (Aksi Primer Penjual) */}
      <Link
        href="/dashboard/products/new"
        className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-semibold text-sm shadow-sm transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Produk Baru</span>
      </Link>

      {/* 4. Aksi Eksternal: Lihat Katalog & Bagikan Tautan */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>Lihat Katalog</span>
        </a>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-3 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>{copied ? "Link Tersalin!" : "Bagikan Link"}</span>
        </button>
      </div>

      {/* 5. Kotak Panduan Ringkas Jika Produk Masih Kosong */}
      {stats.totalProducts === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs leading-relaxed">
          <p className="font-bold mb-1">Katalog Anda masih kosong</p>
          Klik tombol <strong>Tambah Produk Baru</strong> di atas untuk mengunggah produk pertama Anda. Produk yang ditambahkan akan langsung dapat dilihat oleh calon pembeli.
        </div>
      )}
    </div>
  );
}