"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DASHBOARD_ERROR]", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto mt-6 max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900">
        Gagal Memuat Halaman
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
        {error.message ||
          "Terjadi gangguan koneksi saat mengambil data toko Anda."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Coba Muat Ulang</span>
      </button>
    </div>
  );
}