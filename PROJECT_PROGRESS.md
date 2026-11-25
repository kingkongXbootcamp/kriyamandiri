### 4. Pembaruan Dokumentasi: `docs/PROJECT_PROGRESS.md`

Simpan pembaruan lengkap berikut pada **`docs/PROJECT_PROGRESS.md`**:

```markdown
# PROJECT_PROGRESS.md - KRIYAMANDIRI

## Fase 1: MVP Katalog Instan & WhatsApp (Selesai)

- [x] Setup proyek Next.js 15 App Router, TypeScript, Tailwind CSS, dan Supabase
- [x] Autentikasi penjual (Login, Register, Middleware proteksi dashboard, Logout)
- [x] Profil toko (`stores`), validasi slug unik, dan validasi nomor WhatsApp
- [x] Dashboard penjual mobile-first dengan statistik produk riil
- [x] Manajemen produk (Tambah 3 langkah, Edit, Hapus dengan konfirmasi, Toggle Tersedia/Habis)
- [x] Upload foto kamera/galeri HP dengan kompresi WebP otomatis & pembersihan foto lama di Supabase Storage
- [x] Katalog publik (`/[slug]`) tanpa login, SEO dasar, pencarian nama produk instan, dan Modal Detail Produk
- [x] Keranjang belanja satu toko per sesi dengan validasi stok/harga di server
- [x] Halaman checkout dan formulir data pengiriman pembeli dengan penyimpanan lokal berbasis persetujuan

## Fase 2: Monetisasi & Integrasi Logistik Biteship (Sedang Berjalan)

- [x] **Fase 2.1 – Langkah 1:** Riset & perbandingan API logistik (Biteship vs Shipper) — Dipilih: **Biteship**
- [x] **Fase 2.1 – Langkah 2:** Skema database logistik (`06_fase2_logistics_schema.sql`: perluasan `stores` & `products`, tabel `orders`, `order_items`, `shipments`, RLS, dan fungsi RPC cek resi publik)
- [ ] **Fase 2.1 – Langkah 3:** Layanan klien API Biteship (`lib/biteship.ts`) untuk pencarian area, cek ongkir real-time, pembuatan order kurir, dan pelacakan resi
- [ ] **Fase 2.2:** Pengaturan titik asal pengiriman (kode pos/area) pada Profil Toko & input berat produk (gram) pada Form Produk
- [ ] **Fase 2.3:** Integrasi pilihan ongkir real-time + perhitungan komisi platform pada halaman Checkout & pengiriman ringkasan ke WhatsApp
- [ ] **Fase 2.4:** Dashboard Manajemen Pesanan Penjual (Panggil Kurir, Cetak Resi Otomatis, dan Cek Resi)
```
