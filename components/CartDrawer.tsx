"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  AlertCircle,
  ArrowRight,
  ImageOff,
} from "lucide-react";
import { CartSummary } from "@/types/cart";
import { formatRupiah } from "@/lib/cart-utils";
import { verifyCartOnServer } from "@/actions/cart";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  storeSlug: string;
  summary: CartSummary;
  onIncreaseQty: (productId: string) => void;
  onDecreaseQty: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  storeName,
  storeSlug,
  summary,
  onIncreaseQty,
  onDecreaseQty,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const router = useRouter();
  const [proceeding, setProceeding] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleProceedToCheckout = async () => {
    setProceeding(true);
    setValidationErrors([]);

    try {
      const payload = summary.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const result = await verifyCartOnServer(storeSlug, payload);

      if (!result.valid) {
        setValidationErrors(result.errors);
        setProceeding(false);
        return;
      }

      onClose();
      router.push(`/${storeSlug}/checkout`);
    } catch {
      setValidationErrors([
        "Terjadi gangguan koneksi saat memverifikasi keranjang. Silakan coba lagi.",
      ]);
      setProceeding(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 backdrop-blur-[1px] sm:items-center sm:justify-center sm:p-4"
    >
      {/* Area klik backdrop untuk menutup drawer */}
      <div className="flex-1 sm:hidden" onClick={onClose} />

      {/* Panel Slide-Up di Mobile & Modal Terpusat di Desktop */}
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl sm:border">
        {/* Header Drawer */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5">
          <div>
            <h2
              id="cart-drawer-title"
              className="text-base font-extrabold text-slate-900"
            >
              Keranjang Belanja
            </h2>
            <p className="text-xs text-slate-500">
              {storeName} &bull; {summary.totalItems} barang
            </p>
          </div>

          <div className="flex items-center gap-2">
            {summary.items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setValidationErrors([]);
                  onClearCart();
                }}
                className="min-h-[38px] rounded-xl px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
              >
                Kosongkan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup keranjang"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Daftar Item */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {summary.items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">
                Keranjang Anda masih kosong
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Pilih produk dari katalog untuk menambahkannya ke keranjang.
              </p>
            </div>
          ) : (
            summary.items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-[10px] text-slate-400">
                      <ImageOff className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 sm:text-sm">
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setValidationErrors([]);
                        onRemoveItem(item.productId);
                      }}
                      aria-label={`Hapus ${item.name} dari keranjang`}
                      className="min-h-[32px] shrink-0 rounded-lg px-2 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatRupiah(item.price)} / barang
                  </p>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setValidationErrors([]);
                          onDecreaseQty(item.productId);
                        }}
                        aria-label={`Kurangi ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 active:scale-95"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-extrabold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setValidationErrors([]);
                          onIncreaseQty(item.productId);
                        }}
                        aria-label={`Tambah ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500">
                        Subtotal
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 sm:text-sm">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Perhatian Validasi Keranjang:</span>
              </div>
              <ul className="list-disc space-y-0.5 pl-5">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Subtotal & Navigasi ke Halaman Checkout */}
        {summary.items.length > 0 && (
          <div className="space-y-3 border-t border-slate-200 bg-white p-4 sm:p-5">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal ({summary.totalItems} barang)</span>
                <span className="font-semibold text-slate-900">
                  {formatRupiah(summary.subtotalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-sm">
                <span className="font-bold text-slate-900">
                  Total Harga Barang
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatRupiah(summary.totalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                * Belum termasuk ongkos kirim
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-800 transition hover:bg-slate-200 active:scale-[0.98]"
              >
                + Tambah Produk
              </button>
              <button
                type="button"
                disabled={proceeding}
                onClick={handleProceedToCheckout}
                className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                <span>{proceeding ? "Memproses..." : "Lanjut Checkout"}</span>
                {!proceeding && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}