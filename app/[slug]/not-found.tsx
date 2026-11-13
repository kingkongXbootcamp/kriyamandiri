import React from "react";
import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mx-auto mb-3 font-bold text-lg">
          ?
        </div>
        <h1 className="text-base font-bold text-gray-900">Toko Tidak Ditemukan</h1>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
          Tautan toko yang Anda buka tidak tersedia atau mungkin telah diubah oleh pemilik toko.
        </p>
        <Link
          href="/"
          className="inline-block mt-5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}