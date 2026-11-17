"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Store, Mail, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { loginAction, type AuthActionResponse } from "@/actions/auth";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [state, formAction, isPending] = useActionState<
    AuthActionResponse | null,
    FormData
  >(loginAction, null);

  return (
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Masuk Akun Penjual
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
          Kelola katalog toko dan pantau pesanan WhatsApp Anda.
        </p>
      </div>

      {state?.error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p className="font-medium leading-relaxed">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-bold text-slate-700"
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
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-bold text-slate-700"
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
          className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Buka Toko Gratis
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <div className="flex h-64 w-full max-w-md items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}