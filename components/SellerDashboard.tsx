"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  Share2,
  Check,
  Store as StoreIcon,
  MessageCircle,
  MapPin,
  Sparkles,
} from "lucide-react";
import { SellerDashboardPayload } from "@/actions/dashboard";

export default function SellerDashboard({
  data,
}: {
  data: SellerDashboardPayload;
}) {
  const [copied, setCopied] = useState(false);
  const { store, stats } = data;

  if (!store) {
    return (
      <div className="mx-auto mt-4 max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <StoreIcon className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-lg font-extrabold text-slate-900">
          Profil Toko Belum Dibuat
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
          Lengkapi nama toko, lokasi kota, dan nomor WhatsApp penerima pesanan
          agar katalog online Anda aktif.
        </p>
        <Link
          href="/dashboard/profile"
          className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
        >
          Lengkapi Profil Toko Sekarang
        </Link>
      </div>
    );
  }

  const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "kriyamandiri.id";
  const cleanDomain = baseDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const publicStoreUrl = `https://${cleanDomain}/${store.slug}`;

  const handleCopyOrShare = async () => {
    const shareText = `Halo! Silakan lihat katalog produk *${store.name}* dan pesan langsung lewat WhatsApp di sini:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Katalog ${store.name}`,
          text: shareText,
          url: publicStoreUrl,
        });
        return;
      } catch {
        // Lanjut ke fallback copy clipboard jika dialog share dibatalkan
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
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Kartu Identitas Toko */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 text-lg font-extrabold text-emerald-700">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={`Logo ${store.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                store.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-extrabold text-slate-900 sm:text-lg">
                {store.name}
              </h1>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">{store.city}</span>
              </p>
              <span className="mt-1.5 inline-block max-w-full truncate rounded-lg bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-700">
                {cleanDomain}/{store.slug}
              </span>
            </div>
          </div>

          <Link
            href="/dashboard/profile"
            className="hidden min-h-[40px] shrink-0 items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
          >
            Edit Profil
          </Link>
        </div>
      </section>

      {/* 2. Ringkasan Statistik Produk Riil */}
      <section aria-label="Statistik Produk">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-sm sm:p-4">
            <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">
              Jumlah Produk
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {stats.totalProducts}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-sm sm:p-4">
            <p className="text-[11px] font-semibold text-emerald-700 sm:text-xs">
              Produk Aktif
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600 sm:text-3xl">
              {stats.activeProducts}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-sm sm:p-4">
            <p className="text-[11px] font-semibold text-rose-600 sm:text-xs">
              Produk Habis
            </p>
            <p className="mt-1 text-2xl font-extrabold text-rose-600 sm:text-3xl">
              {stats.outOfStockProducts}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Tombol Aksi Utama & Katalog (Grid Adaptif Desktop) */}
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 sm:gap-3">
        <Link
          href="/dashboard/products/new"
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] sm:col-span-6"
        >
          <Plus className="h-5 w-5" />
          <span>Tambah Produk</span>
        </Link>

        <div className="grid grid-cols-2 gap-2.5 sm:col-span-6">
          <a
            href={`/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50 active:scale-[0.98] sm:text-sm"
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-600" />
            <span>Lihat Katalog</span>
          </a>

          <button
            type="button"
            onClick={handleCopyOrShare}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98] sm:text-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>Bagikan Link</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 4. Kartu Tautan Katalog & Sebar ke WhatsApp */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tautan Katalog Publik Toko
            </h2>
            <p className="mt-1 select-all break-all font-mono text-xs font-medium text-slate-800 sm:text-sm">
              {publicStoreUrl}
            </p>
          </div>

          <a
            href={whatsappShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#1EBE5D] active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Bagikan ke WhatsApp</span>
          </a>
        </div>
      </section>

      {/* 5. Panduan Katalog Kosong (Hanya tampil jika jumlah produk = 0) */}
      {stats.totalProducts === 0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-amber-950">
              Katalog Anda masih kosong
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Tekan tombol <strong>Tambah Produk</strong> di atas untuk
              mengunggah foto, nama, dan harga produk pertama Anda agar pembeli
              dapat langsung memesan via WhatsApp.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}