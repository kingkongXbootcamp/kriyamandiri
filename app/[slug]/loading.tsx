export default function PublicCatalogLoading() {
  return (
    <div
      className="flex min-h-screen animate-pulse flex-col bg-slate-50"
      aria-label="Memuat katalog toko"
    >
      {/* Skeleton Sticky Header Search */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="h-11 w-full rounded-xl bg-slate-200" />
        </div>
      </div>

      {/* Skeleton Main Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 pt-4 pb-24">
        {/* Skeleton Kartu Profil Toko */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-5 w-44 rounded bg-slate-200" />
              <div className="h-3.5 w-28 rounded bg-slate-200" />
              <div className="h-3.5 w-full max-w-md rounded bg-slate-100" />
            </div>
          </div>
        </div>

        {/* Skeleton Judul Katalog */}
        <div className="h-4 w-36 rounded bg-slate-200" />

        {/* Skeleton Grid Produk (2 Kolom HP, 3 Kolom Desktop) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-square w-full bg-slate-200" />
              <div className="space-y-2.5 p-3">
                <div className="h-4 w-4/5 rounded bg-slate-200" />
                <div className="h-3 w-3/5 rounded bg-slate-100" />
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-11 w-full rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}