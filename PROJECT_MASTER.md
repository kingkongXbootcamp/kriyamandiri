# PROJECT MASTER - KRIYAMANDIRI

## 1. Ringkasan Proyek
KRIYAMANDIRI adalah platform web katalog online mobile-first yang dirancang khusus untuk UMKM Indonesia. Memungkinkan penjual mendigitalkan katalog produk dalam hitungan menit dan menerima pesanan terstruktur via WhatsApp (`wa.me`) tanpa biaya server tinggi maupun potongan komisi.

## 2. Prinsip Arsitektur & Batasan Roadmap
- **Bulan 1 (Akuisisi & Validasi - SELESAI):** Katalog Instan + Checkout Form + Generate Teks Pesanan WhatsApp (`wa.me`). Ongkir dihitung manual oleh penjual via chat WhatsApp.
- **Bulan 2 (Monetisasi - Berikutnya):** Integrasi Agregator Logistik (API Biteship/Shipper) untuk cek ongkir instan, panggil kurir, dan cetak resi otomatis.
- **Bulan 3 (Retensi - Rencana):** Modul kasir sederhana (POS) offline dan sinkronisasi stok otomatis.
- **Server Cost Efficiency:** Katalog publik bersifat stateless dengan gambar WebP terkompresi di sisi klien (<150 KB) dan checkout langsung via protokol `wa.me` tanpa beban komputasi server berlebih.
- **Mobile-First & Desktop-Adaptive UX:** Area sentuh minimal `44px`, input `16px` anti-zoom di perangkat seluler, tata letak responsif multi-kolom di desktop, serta dukungan lengkap *loading*, *empty*, dan *error states*.
- **Defense-in-Depth Security:**
  - Proteksi ganda sesi penjual pada `middleware.ts` (`/dashboard/*`) dan `app/(seller)/dashboard/layout.tsx`.
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