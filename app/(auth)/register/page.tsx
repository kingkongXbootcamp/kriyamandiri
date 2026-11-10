"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Store, User, Mail, Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { registerAction, type AuthActionResponse } from "@/app/(auth)/actions";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<
    AuthActionResponse | null,
    FormData
  >(registerAction, null);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-mobile rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Buka Toko KRIYAMANDIRI
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Mulai katalog online Anda dalam 2 menit.
          </p>
        </div>

        {/* Notifikasi Berhasil (Verifikasi Email) */}
        {state?.success && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Pendaftaran Berhasil!</span>
            </div>
            <p className="mt-1 text-emerald-700">
              Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi
              lalu masuk ke akun.
            </p>
            <div className="mt-3">
              <Link
                href="/login"
                className="font-semibold text-brand-700 underline"
              >
                Menuju Halaman Masuk &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Notifikasi Error */}
        {state?.error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="font-medium">{state.error}</p>
          </div>
        )}

        {!state?.success && (
          <form action={formAction} className="mt-6 space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700"
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
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-slate-700"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Tombol Daftar */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
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
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            Masuk di Sini
          </Link>
        </p>
      </div>
    </div>
  );
}