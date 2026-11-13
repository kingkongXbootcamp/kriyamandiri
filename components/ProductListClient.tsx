"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ProductRecord,
  toggleProductAvailability,
  deleteProduct,
} from "@/actions/product";

type FilterStatus = "all" | "available" | "out_of_stock";

export default function ProductListClient({
  initialProducts,
}: {
  initialProducts: ProductRecord[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Tracking loading per item untuk toggle & hapus
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());

      if (!matchesSearch) return false;
      if (filterStatus === "available") return item.is_available;
      if (filterStatus === "out_of_stock") return !item.is_available;
      return true;
    });
  }, [products, searchQuery, filterStatus]);

  const handleToggleAvailability = async (product: ProductRecord) => {
    if (togglingId) return;
    setFeedbackError("");
    const nextStatus = !product.is_available;

    // Optimistic UI update agar terasa instan di HP
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_available: nextStatus } : p))
    );
    setTogglingId(product.id);

    try {
      await toggleProductAvailability(product.id, nextStatus);
      router.refresh();
    } catch (err: unknown) {
      // Kembalikan state jika gagal
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_available: product.is_available } : p
        )
      );
      const msg = err instanceof Error ? err.message : "Gagal memperbarui status stok.";
      setFeedbackError(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteProduct || deleting) return;
    setFeedbackError("");
    setDeleting(true);

    try {
      await deleteProduct(confirmDeleteProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== confirmDeleteProduct.id));
      setConfirmDeleteProduct(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus produk.";
      setFeedbackError(msg);
      setConfirmDeleteProduct(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-4">
      {/* Header Judul & Tombol Tambah */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Daftar Produk</h1>
          <p className="text-xs text-gray-500">{products.length} produk terdaftar di toko</p>
        </div>

        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah</span>
        </Link>
      </div>

      {/* Pencarian & Filter Status */}
      {products.length > 0 && (
        <div className="space-y-2.5">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />

          <div className="flex gap-1.5">
            {(
              [
                { key: "all", label: "Semua" },
                { key: "available", label: "Tersedia" },
                { key: "out_of_stock", label: "Habis" },
              ] as { key: FilterStatus; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === tab.key
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedbackError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
          {feedbackError}
        </div>
      )}

      {/* Kondisi Kosong */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-gray-900">Belum ada produk</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Unggah foto dan harga produk pertama Anda agar muncul di katalog toko.
          </p>
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
          >
            + Tambah Produk Pertama
          </Link>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-sm font-semibold text-gray-700">Produk tidak ditemukan</p>
          <p className="text-xs text-gray-500 mt-1">
            Coba kata kunci pencarian lain atau ubah filter status.
          </p>
        </div>
      ) : (
        /* Daftar Kartu Produk */
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm flex flex-col gap-3"
            >
              {/* Bagian Atas: Foto + Info Produk */}
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover ${
                        !product.is_available ? "opacity-55 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-400 text-center px-1">
                      Tanpa Foto
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h2>
                  </div>

                  <p className="text-sm font-extrabold text-emerald-700 mt-1">
                    {formatRupiah(product.price)}
                  </p>

                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Bagian Bawah: Switch Status + Tombol Edit & Hapus */}
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                {/* Toggle Tersedia / Habis */}
                <button
                  type="button"
                  disabled={togglingId === product.id}
                  onClick={() => handleToggleAvailability(product)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    product.is_available
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      product.is_available ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <span>{product.is_available ? "Tersedia" : "Habis"}</span>
                </button>

                {/* Tombol Edit & Hapus */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/products/${product.id}/edit`}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition"
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteProduct(product)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Produk */}
      {confirmDeleteProduct && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
        >
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Hapus Produk?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Produk <strong>{confirmDeleteProduct.name}</strong> beserta fotonya akan dihapus permanen dari katalog toko Anda.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteProduct(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}