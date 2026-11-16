"use client";

import React, { useState } from "react";
import { CartSummary, ServerCartVerificationResult } from "@/types/cart";
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
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<ServerCartVerificationResult | null>(null);

  if (!isOpen) return null;

  const handleVerifyServerPrice = async () => {
    setVerifying(true);
    setVerificationResult(null);

    try {
      const payload = summary.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
      const result = await verifyCartOnServer(storeSlug, payload);
      setVerificationResult(result);
    } catch {
      setVerificationResult({
        valid: false,
        items: [],
        subtotalAmount: 0,
        totalAmount: 0,
        errors: ["Terjadi gangguan koneksi saat memverifikasi harga ke server."],
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang Belanja"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-[1px]"
    >
      {/* Area klik backdrop untuk menutup drawer */}
      <div className="flex-1" onClick={onClose} />

      {/* Panel Slide-Up Keranjang */}
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header Drawer */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              Keranjang Belanja
            </h2>
            <p className="text-xs text-gray-500">
              {storeName} • {summary.totalItems} barang
            </p>
          </div>

          <div className="flex items-center gap-2">
            {summary.items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setVerificationResult(null);
                  onClearCart();
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                Kosongkan
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup keranjang"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Daftar Item di Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {summary.items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-gray-800">
                Keranjang Anda masih kosong
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Pilih produk dari katalog untuk menambahkannya ke keranjang.
              </p>
            </div>
          ) : (
            summary.items.map((item) => (
              <div
                key={item.productId}
                className="p-3 rounded-2xl border border-gray-200 bg-gray-50/70 flex gap-3"
              >
                {/* Thumbnail Produk */}
                <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
                      Tanpa Foto
                    </div>
                  )}
                </div>

                {/* Rincian & Kontrol Kuantitas */}
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationResult(null);
                        onRemoveItem(item.productId);
                      }}
                      aria-label={`Hapus ${item.name} dari keranjang`}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 shrink-0"
                    >
                      Hapus
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatRupiah(item.price)} / barang
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    {/* Stepper Kuantitas */}
                    <div className="inline-flex items-center bg-white border border-gray-300 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationResult(null);
                          onDecreaseQty(item.productId);
                        }}
                        aria-label={`Kurangi ${item.name}`}
                        className="w-7 h-7 rounded-lg text-gray-700 hover:bg-gray-100 font-extrabold text-sm flex items-center justify-center transition"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-xs font-extrabold text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationResult(null);
                          onIncreaseQty(item.productId);
                        }}
                        aria-label={`Tambah ${item.name}`}
                        className="w-7 h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-sm flex items-center justify-center transition"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal per Item */}
                    <div className="text-right">
                      <span className="block text-[10px] text-gray-500">
                        Subtotal
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-700">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Hasil Verifikasi Harga & Stok Sisi Server */}
          {verificationResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                verificationResult.valid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {verificationResult.valid ? (
                <div className="space-y-1">
                  <p className="font-bold">
                    ✓ Harga & ketersediaan stok terverifikasi server
                  </p>
                  <p>
                    Total sah dari database:{" "}
                    <strong>{formatRupiah(verificationResult.totalAmount)}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold">Perhatian Validasi Server:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {verificationResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Ringkasan Subtotal & Total Harga */}
        {summary.items.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal ({summary.totalItems} barang)</span>
                <span className="font-semibold text-gray-900">
                  {formatRupiah(summary.subtotalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1.5 border-t border-dashed border-gray-200">
                <span className="font-bold text-gray-900">Total Harga</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatRupiah(summary.totalAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
              >
                + Tambah Produk
              </button>

              <button
                type="button"
                disabled={verifying}
                onClick={handleVerifyServerPrice}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                {verifying ? "Memverifikasi..." : "Verifikasi Harga"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}