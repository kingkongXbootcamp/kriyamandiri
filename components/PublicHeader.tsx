import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            KRIYAMANDIRI
          </span>
        </Link>
      </div>
    </header>
  );
}