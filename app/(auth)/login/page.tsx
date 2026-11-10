"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Store, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { loginAction, type AuthActionResponse } from "@/app/(auth)/actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin/profile";

  const [state, formAction, isPending] = useActionState<
    AuthActionResponse | null,
    FormData
  >(loginAction, null);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-mobile rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Masuk Akun Penjual
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Kelola katalog toko dan pantau pesanan Anda.
          </p>
        </div>

        {/* Notifikasi Error */}
        {state?.error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="font-medium">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700"
            >
              Email Akun
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
              Kata Sandi
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Tombol Masuk */}
          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk Sekarang</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Belum punya toko?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            Buka Toko Gratis
          </Link>
        </p>
      </div>
    </div>
  );
}