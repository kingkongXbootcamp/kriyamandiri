"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  X,
  MapPin,
  ShoppingBag,
  ChevronRight,
  Plus,
  Minus,
  AlertCircle,
  ImageOff,
  PackageSearch,
} from "lucide-react";
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

  // Pencarian instan berdasarkan nama produk (mendukung multi-kata)
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

  const cartSummary = useMemo(
    () => calculateCartSummary(cartItems),
    [cartItems]
  );

  const quantityMap = useMemo(() => {
    return new Map(cartItems.map((item) => [item.productId, item.quantity]));
  }, [cartItems]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* 1. Sticky Header Kolom Pencarian Produk */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-2.5 sm:px-6">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
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
              placeholder={`Cari produk di ${store.name}...`}
              aria-label="Cari nama produk"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100/80 pl-10 pr-11 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:text-sm"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Hapus pencarian"
                className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Kontainer Utama Responsif (Mobile-First & Desktop-Friendly) */}
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 pt-4 pb-28 sm:space-y-5 sm:px-6">
        {/* Notifikasi Sesi / Validasi Stok */}
        {cartNotice && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="leading-relaxed">{cartNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setCartNotice(null)}
              aria-label="Tutup pemberitahuan"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100 hover:text-amber-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 2. Identitas & Profil Toko */}
        <section
          aria-label="Profil Toko"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 text-xl font-extrabold text-emerald-700 sm:h-20 sm:w-20">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={`Logo ${store.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                store.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">
                {store.name}
              </h1>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500 sm:text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>{store.city}</span>
              </p>
              {store.description && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
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
          <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
            {hasActiveSearch
              ? `Hasil Pencarian (${filteredProducts.length})`
              : `Katalog Produk (${products.length})`}
          </h2>
          {hasActiveSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="min-h-[34px] rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              Hapus Pencarian
            </button>
          )}
        </div>

        {/* 4. Grid Daftar Produk (2 Kolom Mobile, 3 Kolom Desktop) */}
        {products.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-900 sm:text-base">
              Belum ada produk tersedia
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
              Toko ini belum menampilkan produk di katalog online. Silakan cek
              kembali nanti.
            </p>
          </section>
        ) : filteredProducts.length === 0 ? (
          <section
            role="status"
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                Produk tidak ditemukan
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Tidak ada produk dengan kata kunci{" "}
                <span className="font-semibold text-slate-700">
                  &ldquo;{searchQuery.trim()}&rdquo;
                </span>{" "}
                di toko ini.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              Hapus Pencarian
            </button>
          </section>
        ) : (
          <section
            aria-label="Daftar Produk"
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
          >
            {filteredProducts.map((product, index) => {
              const qtyInCart = quantityMap.get(product.id) || 0;
              const isOutOfStock = !product.is_available;

              return (
                <article
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                >
                  {/* Foto Produk Rasio 1:1 */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading={index < 6 ? "eager" : "lazy"}
                        decoding="async"
                        className={`h-full w-full object-cover transition-transform duration-300 ${
                          isOutOfStock ? "opacity-50 grayscale" : ""
                        }`}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-xs text-slate-400">
                        <ImageOff className="h-5 w-5" />
                        <span className="text-[11px]">Tanpa Foto</span>
                      </div>
                    )}

                    {/* Badge Status Ketersediaan */}
                    <span
                      className={`absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs ${
                        isOutOfStock
                          ? "bg-slate-900/85 text-white"
                          : "bg-emerald-600/95 text-white"
                      }`}
                    >
                      {isOutOfStock ? "Stok Habis" : "Tersedia"}
                    </span>
                  </div>

                  {/* Detail & Tombol Tambah Satu Klik */}
                  <div className="flex flex-1 flex-col justify-between gap-3 p-3 sm:p-3.5">
                    <div>
                      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 sm:text-sm">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-normal text-slate-500">
                          {product.description}
                        </p>
                      )}
                      <p
                        className={`mt-1.5 text-sm font-extrabold sm:text-base ${
                          isOutOfStock ? "text-slate-400" : "text-emerald-700"
                        }`}
                      >
                        {formatRupiah(product.price)}
                      </p>
                    </div>

                    {/* Area Sentuh Minimal 44px */}
                    <div>
                      {isOutOfStock ? (
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="min-h-[44px] w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-400"
                        >
                          Stok Habis
                        </button>
                      ) : qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddOneItem(product)}
                          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.98]"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Keranjang</span>
                        </button>
                      ) : (
                        <div className="flex min-h-[44px] items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-1">
                          <button
                            type="button"
                            onClick={() => handleDecreaseQty(product.id)}
                            aria-label={`Kurangi jumlah ${product.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-800 shadow-xs transition hover:bg-emerald-100 active:scale-95"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-xs font-extrabold text-emerald-950 sm:text-sm">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOneItem(product)}
                            aria-label={`Tambah jumlah ${product.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                          >
                            <Plus className="h-4 w-4" />
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

        {/* Footer Branding Ringkas */}
        <footer className="pt-4 text-center">
          <p className="text-[11px] text-slate-400">
            Katalog digital oleh{" "}
            <span className="font-bold text-slate-600">KRIYAMANDIRI</span>
          </p>
        </footer>
      </main>

      {/* 5. Sticky Floating Bar Ringkasan Keranjang di Bagian Bawah Layar */}
      {hydrated && cartSummary.totalItems > 0 && (
        <div
          role="region"
          aria-label="Ringkasan Keranjang"
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent p-3 sm:p-4"
        >
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto mx-auto flex min-h-[56px] w-full max-w-3xl items-center justify-between rounded-2xl bg-emerald-700 px-4 py-2.5 text-white shadow-lg transition hover:bg-emerald-800 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
                <ShoppingBag className="h-5 w-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-extrabold text-slate-950 shadow-xs">
                  {cartSummary.totalItems}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-emerald-100">
                  {cartSummary.totalItems} Barang &bull; Total Harga
                </p>
                <p className="text-sm font-extrabold tracking-tight sm:text-base">
                  {formatRupiah(cartSummary.totalAmount)}
                </p>
              </div>
            </div>

            <span className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-white px-3.5 text-xs font-extrabold text-emerald-800 shadow-xs">
              <span>Lihat Keranjang</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}

      {/* 6. Slide-Up Drawer / Modal Rincian Keranjang */}
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