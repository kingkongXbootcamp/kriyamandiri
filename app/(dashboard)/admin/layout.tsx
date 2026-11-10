import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Navbar Dashboard Penjual */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/admin/profile" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight text-slate-900">
              KRIYAMANDIRI{" "}
              <span className="text-xs font-medium text-brand-600">Admin</span>
            </span>
          </Link>

          {/* User Email & Tombol Logout */}
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline-block">
              {user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Keluar Akun"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}