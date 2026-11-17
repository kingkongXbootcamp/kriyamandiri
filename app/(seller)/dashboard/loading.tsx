export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Memuat data penjual">
      {/* Skeleton Header Toko */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3.5">
          <div className="h-14 w-14 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-4 w-48 rounded bg-slate-100" />
          </div>
        </div>
      </div>

      {/* Skeleton Statistik 3 Kolom */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-center"
          >
            <div className="mx-auto h-3 w-16 rounded bg-slate-200" />
            <div className="mx-auto mt-2.5 h-7 w-10 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Skeleton Tombol Aksi */}
      <div className="h-12 w-full rounded-xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-11 rounded-xl bg-slate-200" />
        <div className="h-11 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}