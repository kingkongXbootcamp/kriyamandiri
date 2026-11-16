"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { PublicStore, PublicProduct } from "@/lib/public-catalog";
import { CartItem } from "@/types/cart";
import {
  calculateCartSummary,
  formatRupiah,
  loadSingleStoreSessionCart,
  saveSingleStoreSessionCart,
  syncCartWithCatalog,
} from "@/lib/cart-utils";
import CartDrawer from "@/components/CartDrawer";

interface PublicCatalogClientProps {
  store: PublicStore;
  products: PublicProduct[];
}

export default function PublicCatalogClient({
  store,
  products,
}: PublicCatalogClientProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  // 1. Muat keranjang sesi (satu toko per sesi) & sinkronkan stok/harga dari database
  useEffect(() => {
    const { items: sessionItems, replacedPreviousStoreName } =
      loadSingleStoreSessionCart(store);

    const { validItems, removedUnavailableNames } = syncCartWithCatalog(
      sessionItems,
      products
    );

    setCartItems(validItems);
    saveSingleStoreSessionCart(store, validItems);

    if (replacedPreviousStoreName) {
      setCartNotice(
        `Keranjang dari "${replacedPreviousStoreName}" telah dikosongkan karena keranjang hanya berlaku untuk satu toko dalam satu sesi.`
      );
    } else if (removedUnavailableNames.length > 0) {
      setCartNotice(
        `Produk berikut dihapus dari keranjang karena stok habis: ${removedUnavailableNames.join(", ")}.`
      );
    }

    setHydrated(true);
  }, [store, products]);

  // 2. Simpan setiap perubahan keranjang ke sessionStorage browser
  useEffect(() => {
    if (!hydrated) return;
    saveSingleStoreSessionCart(store, cartItems);
  }, [cartItems, store, hydrated]);

  // Pencarian instan berdasarkan nama produk
  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    if (!normalizedQuery) return products;

    const keywords = normalizedQuery.split(/\s+/);
    return products.filter((product) => {
      const productName = product.name.toLowerCase();
      return keywords.every((word) => productName.includes(word));
    });
  }, [products, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Satu klik menambahkan 1 barang (dengan validasi stok habis)
  const handleAddOneItem = (product: PublicProduct) => {
    if (!product.is_available) {
      setCartNotice(`Maaf, stok "${product.name}" sedang habis.`);
      return;
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.id);
      if (existingIndex === -1) {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1,
          },
        ];
      }

      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        price: product.price,
        quantity: updated[existingIndex].quantity + 1,
      };
      return updated;
    });
  };

  // Tambah kuantitas dari dalam keranjang
  const handleIncreaseQty = (productId: string) => {
    const catalogProduct = products.find((p) => p.id === productId);
    if (!catalogProduct || !catalogProduct.is_available) {
      setCartNotice("Produk ini sudah habis dan tidak dapat ditambah.");
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, price: catalogProduct.price, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // Kurangi kuantitas (hapus otomatis jika mencapai 0)
  const handleDecreaseQty = (productId: string) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Hapus satu produk dari keranjang
  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Kosongkan seluruh keranjang toko aktif
  const handleClearCart = () => {
    setCartItems([]);
    setIsCartOpen(false);
  };

  // Hitung ringkasan subtotal & total harga
  const cartSummary = useMemo(
    () => calculateCartSummary(cartItems),
    [cartItems]
  );

  // Map kuantitas cepat per productId untuk rendering kartu produk
  const quantityMap = useMemo(() => {
    return new Map(cartItems.map((item) => [item.productId, item.quantity]));
  }, [cartItems]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 1. Sticky Header Pencarian Produk */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-lg mx-auto px-3.5 py-2.5">
          <div className="relative flex items-center">
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none"
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
              ref={searchInputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari nama produk di ${store.name}...`}
              aria-label="Cari nama produk"
              className="w-full h-11 pl-10 pr-10 bg-gray-100 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-base sm:text-sm text-gray-900 placeholder-gray-500 outline-none transition"
            />

            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Hapus pencarian"
                className="absolute right-1.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200/70 active:bg-gray-200 transition"
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
            )}
          </div>
        </div>
      </header>

      {/* Kontainer Utama Mobile-First */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 pt-4 pb-28 space-y-4">
        {/* Notifikasi Sesi / Validasi Stok */}
        {cartNotice && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-start justify-between gap-2.5 shadow-xs"
          >
            <p className="leading-relaxed">{cartNotice}</p>
            <button
              type="button"
              onClick={() => setCartNotice(null)}
              aria-label="Tutup pemberitahuan"
              className="text-amber-700 hover:text-amber-900 font-bold shrink-0 px-1"
            >
              ×
            </button>
          </div>
        )}

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

        {/* 3. Bar Status Katalog / Pencarian */}
        <div
          aria-live="polite"
          className="flex items-center justify-between gap-2 px-0.5"
        >
          <h2 className="text-sm font-bold text-gray-900">
            {hasActiveSearch
              ? `Hasil Pencarian (${filteredProducts.length})`
              : `Katalog Produk (${products.length})`}
          </h2>

          {hasActiveSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg transition"
            >
              Hapus Pencarian
            </button>
          )}
        </div>

        {/* 4. Grid Daftar Produk 2 Kolom */}
        {products.length === 0 ? (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm font-bold text-gray-800">
              Belum ada produk tersedia
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Toko ini belum menampilkan produk di katalog online.
            </p>
          </section>
        ) : filteredProducts.length === 0 ? (
          <section
            role="status"
            className="bg-white rounded-2xl border border-gray-200 p-7 text-center shadow-sm space-y-3"
          >
            <p className="text-sm font-bold text-gray-900">
              Produk tidak ditemukan
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Tidak ada produk dengan nama{" "}
              <span className="font-semibold text-gray-700">
                &ldquo;{searchQuery.trim()}&rdquo;
              </span>{" "}
              di toko ini.
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
            >
              Hapus Pencarian
            </button>
          </section>
        ) : (
          <section aria-label="Daftar Produk" className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product, index) => {
              const qtyInCart = quantityMap.get(product.id) || 0;
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
                        className={`w-full h-full object-cover ${
                          isOutOfStock ? "opacity-50 grayscale" : ""
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        Foto Belum Tersedia
                      </div>
                    )}

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

                  {/* Detail & Tombol Tambah Satu Klik */}
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
                          onClick={() => handleAddOneItem(product)}
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
                            onClick={() => handleAddOneItem(product)}
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

        {/* Footer */}
        <footer className="pt-4 text-center">
          <p className="text-[11px] text-gray-400">
            Katalog online oleh{" "}
            <span className="font-bold text-gray-600">KRIYAMANDIRI</span>
          </p>
        </footer>
      </main>

      {/* 5. Sticky Floating Bar Ringkasan Keranjang di Bagian Bawah Layar HP */}
      {hydrated && cartSummary.totalItems > 0 && (
        <div
          role="region"
          aria-label="Ringkasan Keranjang"
          className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-white via-white to-transparent pointer-events-none"
        >
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-lg mx-auto pointer-events-auto bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white rounded-2xl px-4 py-3 shadow-lg flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="relative w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-white"
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
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-gray-900 text-[11px] font-extrabold flex items-center justify-center">
                  {cartSummary.totalItems}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-medium text-emerald-100">
                  {cartSummary.totalItems} Barang • Total Harga
                </p>
                <p className="text-sm font-extrabold tracking-tight">
                  {formatRupiah(cartSummary.totalAmount)}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-bold bg-white text-emerald-800 px-3 py-2 rounded-xl shadow-xs shrink-0">
              <span>Lihat Keranjang</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </button>
        </div>
      )}

      {/* 6. Slide-Up Drawer Rincian Keranjang */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        storeName={store.name}
        storeSlug={store.slug}
        summary={cartSummary}
        onIncreaseQty={handleIncreaseQty}
        onDecreaseQty={handleDecreaseQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />
    </div>
  );
}