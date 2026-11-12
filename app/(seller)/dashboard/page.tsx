import { getSellerDashboardData } from "@/actions/dashboard";
import DashboardView from "@/components/DashboardView";
import BottomNav from "@/components/Navigation";

export const dynamic = 'force-dynamic';
export const metadata = {
  title: "Dashboard Penjual - KRIYAMANDIRI",
};


export default async function DashboardPage() {
  const data = await getSellerDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar Desktop/Mobile */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-extrabold text-emerald-600 tracking-tight text-lg">
            KRIYAMANDIRI
          </span>
          <span className="text-xs bg-gray-100 text-gray-700 font-medium px-2.5 py-1 rounded-full">
            Area Penjual
          </span>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-md mx-auto p-4">
        <DashboardView data={data} />
      </main>

      {/* Menu Navigasi Bawah */}
      <BottomNav />
    </div>
  );
}