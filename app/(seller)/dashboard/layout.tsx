import React from "react";
import SellerNavigation from "@/components/SellerNavigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar Aplikasi */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-base font-extrabold tracking-tight text-emerald-600">
            KRIYAMANDIRI
          </span>
          <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
            Dashboard Penjual
          </span>
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