import React from "react";
import Link from "next/link";
import { Store, LogOut } from "lucide-react";
import SellerNavigation, { DesktopSellerNav } from "@/components/SellerNavigation";
import { logoutAction } from "@/actions/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Bar Aplikasi */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              KRIYAMANDIRI
            </span>
          </Link>

          {/* Navigasi Desktop */}
          <DesktopSellerNav />

          {/* Tombol Keluar (Logout) dengan area sentuh minimal 44px */}
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Keluar dari akun penjual"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </header>

      {/* Area Konten Utama Responsif (Mobile & Desktop) */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-24 sm:px-6 sm:pb-10">
        {children}
      </main>

      {/* Menu Navigasi Bawah Khusus Mobile */}
      <SellerNavigation />
    </div>
  );
}