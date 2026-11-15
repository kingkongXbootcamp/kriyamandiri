import React from "react";
import SellerNavigation from "@/components/SellerNavigation";
import { logoutAction } from "@/actions/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar Aplikasi */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-emerald-600">
              KRIYAMANDIRI
            </span>
            <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              Dashboard Penjual
            </span>
          </div>

          {/* Tombol Keluar (Logout) */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </header>

      {/* Area Konten Utama Mobile-First */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-24">
        {children}
      </main>

      {/* Menu Navigasi Bawah */}
      <SellerNavigation />
    </div>
  );
}