import { createClient } from "@/lib/supabase/server";
import { User, Store, ShieldCheck } from "lucide-react";

export default async function ProfileDashboardPlaceholder() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      {/* Kartu Status Penjual */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3 w-3" />
              <span>Sesi Terautentikasi</span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Selamat Datang, {user?.user_metadata?.full_name || "Penjual"}!
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Akun terdaftar: {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Modul Setup Toko */}
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-semibold text-slate-900">
          Langkah Selanjutnya: Setup Profil Toko
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
          Fondasi autentikasi telah siap. Pada prompt berikutnya, Anda akan
          mengatur Nama Toko, Tautan Toko Unik (Slug), dan Nomor WhatsApp
          Penjual.
        </p>
      </div>
    </div>
  );
}