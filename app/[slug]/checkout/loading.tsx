export default function CheckoutLoading() {
  return (
    <div
      className="flex min-h-screen animate-pulse flex-col bg-slate-50"
      aria-label="Memuat halaman checkout"
    >
      {/* Skeleton Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-4 w-24 rounded bg-slate-200" />
        </div>
      </div>

      {/* Skeleton Main */}
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 pt-5 pb-12">
        <div className="space-y-1.5">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="h-3.5 w-64 rounded bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 md:order-2 md:col-span-5">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="h-14 w-full rounded-xl bg-slate-100" />
            <div className="h-14 w-full rounded-xl bg-slate-100" />
            <div className="h-10 w-full rounded-xl bg-slate-200" />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 md:order-1 md:col-span-7">
            <div className="h-4 w-48 rounded bg-slate-200" />
            {[1, 2, 3, 4].map((field) => (
              <div key={field} className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="h-11 w-full rounded-xl bg-slate-100" />
              </div>
            ))}
            <div className="h-12 w-full rounded-xl bg-slate-200" />
          </div>
        </div>
      </main>
    </div>
  );
}