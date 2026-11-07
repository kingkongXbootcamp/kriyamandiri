import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, Store, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          <Zap className="h-3.5 w-3.5" />
          <span>Fase 1: Katalog Instan & Order WhatsApp</span>
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Katalog Digital UMKM, Pesanan Langsung Masuk WhatsApp
        </h1>

        <p className="mt-4 text-base text-slate-600 sm:text-lg">
          Tinggalkan format ketik manual yang melelahkan. Bagikan satu tautan
          katalog toko Anda, biarkan pembeli memilih menu, dan terima rincian
          pesanan rapi via WhatsApp.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <span>Buka Toko Gratis</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            Masuk ke Toko Saya
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-brand-700">
              <Store className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-semibold text-slate-900">Katalog Cepat</h2>
            <p className="mt-1 text-sm text-slate-500">
              Setup profil toko dan upload produk dalam hitungan menit lewat HP.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-whatsapp-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-semibold text-slate-900">Format wa.me Otomatis</h2>
            <p className="mt-1 text-sm text-slate-500">
              Rincian barang, total harga, dan alamat pembeli tersusun rapi tanpa repot.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-semibold text-slate-900">Nol Biaya Server</h2>
            <p className="mt-1 text-sm text-slate-500">
              Arsitektur ringan dan cepat (&lt;2 detik) tanpa beban server yang mahal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
