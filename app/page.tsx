import { getAllPublicStores } from "@/lib/public-catalog";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stores = await getAllPublicStores();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sederhana */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-emerald-700 text-lg">KRIYAMANDIRI</h1>
          <Link href="/login" className="text-sm font-semibold text-emerald-600">
            Buka Toko
          </Link>
        </div>
      </header>

      {/* Direktori Toko */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Temukan Toko Lokal</h2>
        
        {stores.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Belum ada toko yang terdaftar.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stores.map((store) => (
              <Link 
                href={`/${store.slug}`} 
                key={store.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-300">{store.name.charAt(0)}</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate">{store.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{store.city}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}