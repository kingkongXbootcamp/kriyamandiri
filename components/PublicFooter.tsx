import Link from "next/link";
import { Store } from "lucide-react";

interface PublicFooterProps {
  /**
   * Beri ruang ekstra di bawah pada halaman katalog toko
   * agar tidak tertutup sticky floating bar keranjang.
   */
  hasFloatingCartBar?: boolean;
}

export default function PublicFooter({
  hasFloatingCartBar = false,
}: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`w-full border-t border-slate-200 bg-white ${
        hasFloatingCartBar ? "pb-24 sm:pb-24" : "pb-8"
      } pt-8`}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
        {/* Kiri: Identitas & Copyright KRIYAMANDIRI */}
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 text-slate-900 transition hover:text-emerald-700"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Store className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold tracking-tight">
              KRIYAMANDIRI
            </span>
          </Link>
          <p className="text-xs text-slate-500">
            &copy; {currentYear} KRIYAMANDIRI. Katalog Digital &amp; Order
            WhatsApp UMKM Indonesia.
          </p>
        </div>

        {/* Kanan: Kredit & Logo Placeholder Kingkong Bootcamp */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black tracking-tighter text-amber-400"
          >
            KB
          </span>
          <div className="text-left">
            <p className="text-[11px] leading-tight text-slate-500">
              Dikembangkan oleh
            </p>
            <p className="text-xs font-extrabold leading-tight text-slate-800">
              Kingkong Bootcamp
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}