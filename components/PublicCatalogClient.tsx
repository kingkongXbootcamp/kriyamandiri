"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PublicStore, PublicProduct } from "@/lib/public-catalog";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
}

interface PublicCatalogClientProps {
  store: PublicStore;
  products: PublicProduct[];
}

export default function PublicCatalogClient({
  store,
  products,
}: PublicCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [hydrated, setHydrated] = useState(false);

  const storageKey = `kriyamandiri_cart_${store.slug}`;

  // Muat isi keranjang tersimpan dari localStorage saat halaman dibuka
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, CartItem>;
        // Bersihkan item jika produk sudah habis atau tidak lagi aktif di katalog
        const validProductMap = new Map(products.map((p) => [p.id, p]));
        const syncedCart: Record<string, CartItem> = {};

        Object.values(parsed).forEach((item) => {
          const currentProduct = validProductMap.get(item.productId);
          if (currentProduct && currentProduct.is_available && item.quantity > 0) {
            syncedCart[item.productId] = {
              productId: currentProduct.id,
              name: currentProduct.name,
              price: currentProduct.price,
              image_url: currentProduct.image_url,
              quantity: item.quantity,
            };
          }
        });

        setCart(syncedCart);
      }
    } catch {
      // Abaikan jika browser memblokir localStorage
    } finally {
      setHydrated(true);
    }
  }, [storageKey, products]);

  // Simpan setiap perubahan keranjang ke localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // Abaikan error kuota storage
    }
  }, [cart, storageKey, hydrated]);

  // Filter pencarian produk secara instan tanpa request tambahan ke server
  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.toLowerCase().trim();
    if (!keyword) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        (product.description && product.description.toLowerCase().includes(keyword))
    );
  }, [products, searchQuery]);

  // Tambah 1 kuantitas produk (hanya jika produk tersedia)
  const handleAddToCart = (product: PublicProduct) => {
    if (!product.is_available) return;

    setCart((prev) => {
      const existing = prev[product.id];
      const nextQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [product.id]: {
          productId: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          quantity: nextQty,
        },
      };
    });
  };

  // Kurangi 1 kuantitas produk
  const handleDecreaseQty = (productId: string) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }

      return {
        ...prev,
        [productId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const { totalItems, totalAmount } = useMemo(() => {
    return Object.values(cart).reduce(
      (acc, item) => {
        acc.totalItems += item.quantity;
        acc.totalAmount += item.price * item.quantity;
        return acc;
      },
      { totalItems: 0, totalAmount: 0 }
    );
  }, [cart]);

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 1. Sticky Header Pencarian Produk */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-lg mx-auto px-3.5 py-2.5 flex items-center gap-2.5">
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari produk di ${store.name}...`}
              aria-label="Cari produk"
              className="w-full pl-9 pr-3 py-2 bg-gray-100 focus:bg-white border border-transparent focus:border-emerald-500 rounded-xl text-sm text-gray-900 placeholder-gray-500 outline-none transition"
            />
          </div>
        </div>
      </header>

      {/* Kontainer Utama Mobile-First */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 pt-4 pb-28 space-y-4">
        {/* 2. Identitas & Profil Toko */}
        <section
          aria-label="Profil Toko"
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-extrabold text-2xl shrink-0 overflow-hidden">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={`Logo ${store.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                store.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold text-gray-900 leading-snug">
                {store.name}
              </h1>

              <p className="text-xs font-medium text-gray-500 mt-0.5 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{store.city}</span>
              </p>

              {store.description && (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {store.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 3. Header Daftar Produk */}
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-bold text-gray-900">
            Katalog Produk ({filteredProducts.length})
          </h2>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Reset Pencarian
            </button>
          )}
        </div>

        {/* 4. Grid Daftar Produk 2 Kolom */}
        {products.length === 0 ? (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm font-bold text-gray-800">Belum ada produk tersedia</p>
            <p className="text-xs text-gray-500 mt-1">
              Toko ini belum menampilkan produk di katalog online.
            </p>
          </section>
        ) : filteredProducts.length === 0 ? (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm font-bold text-gray-800">Produk tidak ditemukan</p>
            <p className="text-xs text-gray-500 mt-1">
              Tidak ada produk yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
            </p>
          </section>
        ) : (
          <section
            aria-label="Daftar Produk"
            className="grid grid-cols-2 gap-3"
          >
            {filteredProducts.map((product, index) => {
              const qtyInCart = cart[product.id]?.quantity || 0;
              const isOutOfStock = !product.is_available;

              return (
                <article
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col"
                >
                  {/* Foto Produk Rasio 1:1 */}
                  <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading={index < 4 ? "eager" : "lazy"}
                        decoding="async"
                        className={`w-full h-full object-cover transition-transform duration-200 ${
                          isOutOfStock ? "opacity-50 grayscale" : ""
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        Foto Belum Tersedia
                      </div>
                    )}

                    {/* Badge Status Ketersediaan */}
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                        isOutOfStock
                          ? "bg-gray-900/85 text-white"
                          : "bg-emerald-600/95 text-white"
                      }`}
                    >
                      {isOutOfStock ? "Stok Habis" : "Tersedia"}
                    </span>
                  </div>

                  {/* Detail Produk */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-normal">
                          {product.description}
                        </p>
                      )}

                      <p
                        className={`text-sm font-extrabold mt-1.5 ${
                          isOutOfStock ? "text-gray-400" : "text-emerald-700"
                        }`}
                      >
                        {formatRupiah(product.price)}
                      </p>
                    </div>

                    {/* Tombol Aksi Keranjang */}
                    <div>
                      {isOutOfStock ? (
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="w-full py-2 px-2.5 bg-gray-100 border border-gray-200 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed"
                        >
                          Stok Habis
                        </button>
                      ) : qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="w-full py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1"
                        >
                          <span>+ Keranjang</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleDecreaseQty(product.id)}
                            aria-label={`Kurangi jumlah ${product.name}`}
                            className="w-7 h-7 rounded-lg bg-white text-emerald-800 font-extrabold text-sm shadow-xs hover:bg-emerald-100 transition flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="text-xs font-extrabold text-emerald-900">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            aria-label={`Tambah jumlah ${product.name}`}
                            className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-extrabold text-sm shadow-xs hover:bg-emerald-700 transition flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Footer Viral Branding */}
        <footer className="pt-4 text-center">
          <p className="text-[11px] text-gray-400">
            Katalog online oleh <span className="font-bold text-gray-600">KRIYAMANDIRI</span>
          </p>
        </footer>
      </main>

      {/* 5. Sticky Floating Bar Ringkasan Keranjang (Tanpa Checkout) */}
      {hydrated && totalItems > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-white via-white to-transparent pointer-events-none"
        >
          <div className="max-w-lg mx-auto pointer-events-auto bg-emerald-700 text-white rounded-2xl px-4 py-3 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-100">
                  {totalItems} Barang di Keranjang
                </p>
                <p className="text-sm font-extrabold tracking-tight">
                  {formatRupiah(totalAmount)}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold bg-emerald-800/80 px-2.5 py-1 rounded-lg text-emerald-100">
              Tersimpan
            </span>
          </div>
        </div>
      )}
    </div>
  );
}