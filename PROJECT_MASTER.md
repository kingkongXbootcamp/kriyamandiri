### 3. Pembaruan Dokumentasi: `docs/PROJECT_MASTER.md`

Simpan pembaruan lengkap berikut pada **`docs/PROJECT_MASTER.md`**:

````markdown
# PROJECT_MASTER.md - KRIYAMANDIRI

## 1. Gambaran Umum Proyek

**KRIYAMANDIRI** adalah platform katalog online _mobile-first_ untuk UMKM Indonesia yang menghubungkan etalase produk instan dengan pemesanan langsung ke WhatsApp penjual, serta dilengkapi integrasi agregator logistik untuk cek ongkir real-time, pemanggilan kurir, dan cetak resi otomatis.

## 2. Stack Teknologi

- **Frontend & Full-stack Framework:** Next.js 15 (App Router), React, TypeScript
- **Styling:** Tailwind CSS (Mobile-First UI)
- **Backend, Database, Auth & Storage:** Supabase (PostgreSQL, Row Level Security, Supabase Auth, Supabase Storage)
- **Agregator Logistik (Fase 2):** Biteship REST API
- **Hosting & Deployment:** Vercel

## 3. Arsitektur & Alur Sistem

1. **Fase 1 – Akuisisi & Katalog WhatsApp (Selesai):**
   - Penjual mendaftarkan profil toko (`/[slug]`) dan mengunggah produk maksimal 3 langkah dengan kompresi WebP otomatis.
   - Pembeli membuka katalog tanpa login, mencari produk, melihat detail produk via modal, menambah ke keranjang sesi (1 toko per sesi), dan mengisi data pengiriman.
2. **Fase 2 – Monetisasi & Logistik Biteship (Sedang Berjalan):**
   - Penjual melengkapi titik asal pengiriman (_origin area & postal code_) dan berat produk (gram).
   - Pembeli melihat pilihan tarif ongkir real-time saat checkout.
   - Pesanan tersimpan di database beserta komisi platform per pengiriman, lalu penjual dapat memanggil kurir dan mencetak resi otomatis dari dashboard.

## 4. Struktur Folder Proyek

```text
kriyamandiri/
├── docs/
│   ├── PROJECT_MASTER.md
│   ├── PROJECT_PROGRESS.md
│   └── DATABASE_SCHEMA.md
├── supabase/
│   └── migrations/
│       ├── 01_init_stores.sql
│       ├── 02_init_products.sql
│       ├── 03_products_policies.sql
│       ├── 04_storage_delete_policy.sql
│       ├── 05_public_catalog_rls.sql
│       └── 06_fase2_logistics_schema.sql
├── src/                                  # (Jika menggunakan direktori src/)
│   ├── middleware.ts
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (seller)/
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── profile/page.tsx
│   │   │       └── products/
│   │   │           ├── page.tsx
│   │   │           ├── new/page.tsx
│   │   │           └── [id]/edit/page.tsx
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       ├── not-found.tsx
│   │       └── checkout/page.tsx
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── store.ts
│   │   ├── dashboard.ts
│   │   ├── product.ts
│   │   └── cart.ts
│   ├── components/
│   │   ├── SellerNavigation.tsx
│   │   ├── SellerDashboard.tsx
│   │   ├── StoreProfileForm.tsx
│   │   ├── ProductImageUploader.tsx
│   │   ├── ProductForm.tsx
│   │   ├── ProductListClient.tsx
│   │   ├── PublicCatalogClient.tsx
│   │   ├── ProductDetailModal.tsx
│   │   ├── CartDrawer.tsx
│   │   └── CheckoutClient.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   ├── validators.ts
│   │   ├── product-validators.ts
│   │   ├── image-compressor.ts
│   │   ├── public-catalog.ts
│   │   ├── cart-utils.ts
│   │   └── checkout-validators.ts
│   └── types/
│       ├── index.ts
│       ├── cart.ts
│       └── checkout.ts
```
````
