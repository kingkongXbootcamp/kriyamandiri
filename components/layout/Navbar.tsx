"use client";

import Link from "next/link";
import { useState } from "react";
import { Store, Menu, X } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            KRIYAMANDIRI
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Masuk Penjual
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Buka Toko
          </Link>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 sm:hidden"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex h-10 items-center px-2 text-sm font-medium text-slate-700 hover:text-brand-600"
            >
              Masuk Penjual
            </Link>
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="flex h-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700"
            >
              Buka Toko Sekarang
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}