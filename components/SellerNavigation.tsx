"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Store } from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    Icon: LayoutDashboard,
  },
  {
    label: "Produk",
    href: "/dashboard/products",
    Icon: Package,
  },
  {
    label: "Profil Toko",
    href: "/dashboard/profile",
    Icon: Store,
  },
];

function checkIsActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(href);
}

/**
 * Navigasi Top Header untuk layar tablet & desktop (>= 640px)
 */
export function DesktopSellerNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi Desktop Penjual"
      className="hidden items-center gap-1 sm:flex"
    >
      {NAV_ITEMS.map(({ label, href, Icon }) => {
        const isActive = checkIsActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Bottom Navigation Bar ergonomis ibu jari untuk layar ponsel (< 640px)
 */
export default function SellerNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu Navigasi Bawah Penjual"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm sm:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = checkIsActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                isActive
                  ? "font-bold text-emerald-600"
                  : "font-medium text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}