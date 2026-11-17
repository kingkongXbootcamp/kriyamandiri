"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  X,
  PackageOpen,
  Pencil,
  Trash2,
  AlertCircle,
  ImageOff,
} from "lucide-react";
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

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] =
    useState<ProductRecord | null>(null);
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

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, is_available: nextStatus } : p
      )
    );
    setTogglingId(product.id);

    try {
      await toggleProductAvailability(product.id, nextStatus);
      router.refresh();
    } catch (err: unknown) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_available: product.is_available } : p
        )
      );
      const msg =
        err instanceof Error ? err.message : "Gagal memperbarui status stok.";
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
      setProducts((prev) =>
        prev.filter((p) => p.id !== confirmDeleteProduct.id)
      );
      setConfirmDeleteProduct(null);
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghapus produk.";
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">
            Daftar Produk
          </h1>
          <p className="text-xs text-slate-500">
            {products.length} produk terdaftar di toko
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Produk</span>
        </Link>
      </div>

      {/* Pencarian & Filter Status */}
      {products.length > 0 && (
        <div className="space-y-2.5">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk..."
              aria-label="Cari nama produk"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
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
                className={`min-h-[38px] rounded-xl px-3.5 text-xs font-bold transition ${
                  filterStatus === tab.key
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedbackError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Empty State / Daftar Kartu Produk */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <PackageOpen className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">
            Belum ada produk
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
            Unggah foto, nama, dan harga produk pertama Anda agar muncul di
            katalog toko.
          </p>
          <Link
            href="/dashboard/products/new"
            className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Produk Pertama</span>
          </Link>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-800">
            Produk tidak ditemukan
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Coba kata kunci pencarian lain atau ubah filter status stok.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
            }}
            className="mt-4 inline-flex min-h-[40px] items-center rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300"
            >
              {/* Bagian Atas: Foto + Info Produk */}
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className={`h-full w-full object-cover ${
                        !product.is_available ? "opacity-55 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] text-slate-400">
                      <ImageOff className="h-4 w-4" />
                      <span>No Foto</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-sm font-extrabold text-emerald-700">
                    {formatRupiah(product.price)}
                  </p>
                  {product.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Bagian Bawah: Switch Status + Tombol Edit & Hapus (Min 40-44px touch target) */}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  disabled={togglingId === product.id}
                  onClick={() => handleToggleAvailability(product)}
                  aria-label={`Ubah status stok ${product.name}`}
                  className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition active:scale-95 ${
                    product.is_available
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      product.is_available ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <span>{product.is_available ? "Tersedia" : "Habis"}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/dashboard/products/${product.id}/edit`}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteProduct(product)}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
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
          aria-labelledby="modal-delete-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[1px] sm:items-center"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div>
              <h3
                id="modal-delete-title"
                className="text-base font-extrabold text-slate-900"
              >
                Hapus Produk?
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                Produk{" "}
                <strong className="text-slate-900">
                  {confirmDeleteProduct.name}
                </strong>{" "}
                beserta fotonya akan dihapus permanen dari katalog toko Anda.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteProduct(null)}
                className="min-h-[44px] rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-800 transition hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="min-h-[44px] rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
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