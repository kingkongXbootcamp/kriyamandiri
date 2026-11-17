"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  Store,
  User,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { registerAction, type AuthActionResponse } from "@/app/(auth)/actions";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<
    AuthActionResponse | null,
    FormData
  >(registerAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Beranda</span>
          </Link>
        </div>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Buka Toko KRIYAMANDIRI
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
            Buat katalog online UMKM Anda dalam hitungan menit.
          </p>
        </div>

        {state?.success && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900"
          >
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Pendaftaran Berhasil!</span>
            </div>
            <p className="mt-1.5 leading-relaxed text-emerald-700">
              Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi
              lalu masuk ke akun.
            </p>
            <div className="mt-3">
              <Link
                href="/login"
                className="inline-flex min-h-[36px] items-center font-bold text-emerald-700 underline hover:text-emerald-800"
              >
                Menuju Halaman Masuk &rarr;
              </Link>
            </div>
          </div>
        )}

        {state?.error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="font-medium leading-relaxed">{state.error}</p>
          </div>
        )}

        {!state?.success && (
          <form action={formAction} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-bold text-slate-700"
              >
                Nama Lengkap Pemilik
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700"
              >
                Email Aktif
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="nama@tokomu.com"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700"
              >
                Kata Sandi (Minimal 6 karakter)
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold text-slate-700"
              >
                Ulangi Kata Sandi
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <span>Daftar Toko Baru</span>
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Masuk di Sini
          </Link>
        </p>
      </div>
    </div>
  );
}