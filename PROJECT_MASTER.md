# PROJECT MASTER - KRIYAMANDIRI

## 1. Ringkasan Proyek
KRIYAMANDIRI adalah platform web katalog online mobile-first yang dirancang khusus untuk UMKM Indonesia. Memungkinkan penjual mendigitalkan katalog produk dalam hitungan menit dan menerima pesanan terstruktur via WhatsApp (`wa.me`) tanpa biaya server tinggi maupun potongan komisi.

## 2. Prinsip Arsitektur & Standar Keamanan
- **Lean & Modular:** Dibangun bertahap per bulan pengembangan (Bulan 1 Validasi -> Bulan 2 Logistik -> Bulan 3 POS Offline).
- **Server Cost Efficiency:** Katalog publik bersifat stateless dengan gambar WebP terkompresi di sisi klien (<150 KB) dan checkout langsung via protokol `wa.me`.
- **Mobile-First & Desktop-Adaptive UX:** Area sentuh minimal `44px`, input `16px` anti-zoom di perangkat seluler, tata letak responsif multi-kolom di desktop, serta dukungan lengkap *loading*, *empty*, dan *error states*.
- **Defense-in-Depth Security:**
  - Proteksi ganda sesi penjual pada `middleware.ts` dan `app/(seller)/dashboard/layout.tsx`.
  - Isolasi multi-tenant via PostgreSQL RLS dan verifikasi prefix folder `user.id` pada URL gambar produk.
  - Pencegahan Stored XSS (escaping `\u003c` pada JSON-LD SSR dan validasi ketat protokol `https://`).
  - Verifikasi ulang harga satuan, status stok, dan status aktif toko di server (`verifyCartOnServer`) sebelum membuat tautan `wa.me`.
  - HTTP Security Headers (`X-Frame-Options: DENY`, `nosniff`, `HSTS`, `Permissions-Policy`) dan sliding-window rate limiter.

## 3. Tech Stack Terimplementasi
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling & Ikon UI:** Tailwind CSS v3 + Lucide React
- **Database, Auth & Storage:** Supabase (PostgreSQL + Row Level Security + SSR Cookie Auth + Storage Bucket `product-images`)
- **Client Persistence:** `sessionStorage` (keranjang satu toko per sesi) & `localStorage` opt-in (profil pengiriman pembeli)
- **Order Channel:** Native WhatsApp Protocol (`https://wa.me/628xxx?text=...` dengan `encodeURIComponent`)

## 4. Struktur Folder Terkini
```text
kriyamandiri/
├── actions/
│   ├── auth.ts
│   ├── cart.ts
│   ├── dashboard.ts
│   ├── product.ts
│   └── store.ts
├── app/
│   ├── (auth)/
│   │   ├── actions.ts
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (seller)/
│   │   └── dashboard/
│   │       ├── error.tsx
│   │       ├── layout.tsx
│   │       ├── loading.tsx
│   │       ├── page.tsx
│   │       ├── profile/page.tsx
│   │       └── products/
│   │           ├── page.tsx
│   │           ├── new/page.tsx
│   │           └── [id]/edit/page.tsx
│   ├── [slug]/
│   │   ├── loading.tsx
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   └── checkout/
│   │       ├── loading.tsx
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CartDrawer.tsx
│   ├── CheckoutClient.tsx
│   ├── ProductForm.tsx
│   ├── ProductImageUploader.tsx
│   ├── ProductListClient.tsx
│   ├── PublicCatalogClient.tsx
│   ├── SellerDashboard.tsx
│   ├── SellerNavigation.tsx
│   └── StoreProfileForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── middleware.ts
│   │   └── server.ts
│   ├── cart-utils.ts
│   ├── checkout-validators.ts
│   ├── image-compressor.ts
│   ├── product-validators.ts
│   ├── public-catalog.ts
│   ├── security.ts
│   ├── validators.ts
│   └── whatsapp-generator.ts
├── supabase/
│   └── migrations/
│       ├── 20260218000001_initial_schema.sql
│       └── 20261117000001_security_hardening.sql
├── types/
│   ├── cart.ts
│   ├── checkout.ts
│   └── database.ts
├── middleware.ts
└── next.config.ts