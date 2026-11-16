import { PublicProduct, PublicStore } from "@/lib/public-catalog";
import {
  CartItem,
  CartItemWithSubtotal,
  CartSummary,
  SessionCartData,
} from "@/types/cart";

const SESSION_CART_KEY = "kriyamandiri_session_cart";

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Muat keranjang sesi dan pastikan hanya berlaku untuk 1 toko aktif
export function loadSingleStoreSessionCart(currentStore: PublicStore): {
  items: CartItem[];
  replacedPreviousStoreName: string | null;
} {
  if (typeof window === "undefined") {
    return { items: [], replacedPreviousStoreName: null };
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_CART_KEY);
    if (!raw) {
      saveSingleStoreSessionCart(currentStore, []);
      return { items: [], replacedPreviousStoreName: null };
    }

    const parsed = JSON.parse(raw) as SessionCartData;

    // Jika sesi sebelumnya milik toko yang berbeda, reset keranjang untuk toko saat ini
    if (parsed.storeId !== currentStore.id) {
      const hadItemsInOtherStore =
        Array.isArray(parsed.items) && parsed.items.length > 0;
      const previousStoreName = hadItemsInOtherStore ? parsed.storeName : null;

      saveSingleStoreSessionCart(currentStore, []);
      return {
        items: [],
        replacedPreviousStoreName: previousStoreName,
      };
    }

    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      replacedPreviousStoreName: null,
    };
  } catch {
    return { items: [], replacedPreviousStoreName: null };
  }
}

// Simpan state keranjang sementara ke sessionStorage browser
export function saveSingleStoreSessionCart(
  store: PublicStore,
  items: CartItem[]
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: SessionCartData = {
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      items,
      updatedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(SESSION_CART_KEY, JSON.stringify(payload));
  } catch {
    // Abaikan jika browser membatasi akses storage
  }
}

// Sinkronisasi item keranjang dengan status stok & harga terbaru dari database
export function syncCartWithCatalog(
  storedItems: CartItem[],
  catalogProducts: PublicProduct[]
): {
  validItems: CartItem[];
  removedUnavailableNames: string[];
} {
  const productMap = new Map(catalogProducts.map((p) => [p.id, p]));
  const validItems: CartItem[] = [];
  const removedUnavailableNames: string[] = [];

  for (const item of storedItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      continue;
    }

    const latestProduct = productMap.get(item.productId);

    // Hapus item jika produk sudah nonaktif/dihapus atau status stoknya Habis
    if (!latestProduct || !latestProduct.is_available) {
      removedUnavailableNames.push(item.name);
      continue;
    }

    // Perbarui nama, harga, dan foto dengan data terbaru dari database
    validItems.push({
      productId: latestProduct.id,
      name: latestProduct.name,
      price: latestProduct.price,
      image_url: latestProduct.image_url,
      quantity: item.quantity,
    });
  }

  return { validItems, removedUnavailableNames };
}

// Hitung subtotal per produk, total kuantitas, dan total harga keseluruhan
export function calculateCartSummary(items: CartItem[]): CartSummary {
  let totalItems = 0;
  let subtotalAmount = 0;

  const itemsWithSubtotal: CartItemWithSubtotal[] = items.map((item) => {
    const subtotal = item.price * item.quantity;
    totalItems += item.quantity;
    subtotalAmount += subtotal;

    return {
      ...item,
      subtotal,
    };
  });

  return {
    items: itemsWithSubtotal,
    totalItems,
    subtotalAmount,
    totalAmount: subtotalAmount,
  };
}