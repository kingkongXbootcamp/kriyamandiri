#### `PROJECT_PROGRESS.md`
```markdown
# PROJECT PROGRESS - KRIYAMANDIRI

## Roadmap Ikhtisar
- [ ] **Bulan 1:** Akuisisi & Validasi (Katalog Instan, Quick Cart, WhatsApp Generator)
- [ ] **Bulan 2:** Monetisasi (Integrasi Logistik Biteship/Shipper, Cek Ongkir, Cetak Resi)
- [ ] **Bulan 3:** Retensi (Modul Kasir POS Offline & Sinkronisasi Stok)

---

## Detail Sprint Bulan 1

### Tahap 1: Perencanaan & Fondasi
- [x] PROMPT 01: Penyelarasan Aturan Kerja & Filosofi Proyek (Selesai)
- [x] PROMPT 02: Analisis Kebutuhan Sistem / SRS MVP Bulan 1 (Selesai)
- [x] PROMPT 03: Pemilihan Teknologi & Arsitektur Hemat Biaya (Selesai)
- [x] PROMPT 04: Struktur Proyek, Konfigurasi Dasar, dan Layout Fondasi (Selesai)
- [x] PROMPT 05: Desain Skema Database, Migration SQL, dan Kebijakan RLS (Selesai)

### Tahap 2: Backend & Otentikasi Penjual
- [ ] PROMPT 06: Konfigurasi Supabase Client & Middleware Session (Server & Client Context)
- [ ] PROMPT 07: Modul Autentikasi Penjual (Registrasi, Login, Logout)
- [ ] PROMPT 08: Modul Manajemen Profil Toko & Pengaturan Link Slug

### Tahap 3: Manajemen Produk Penjual
- [ ] PROMPT 09: Modul Kompresi Gambar Client-Side & Upload Storage
- [ ] PROMPT 10: CRUD Produk & Toggle Ketersediaan Stok (Ada / Habis)

### Tahap 4: Katalog Pembeli & Integrasi WhatsApp
- [ ] PROMPT 11: Halaman Publik Katalog Toko Mobile-First (`/toko/[slug]`)
- [ ] PROMPT 12: Sistem Keranjang Belanja Ramping & LocalStorage Buyer
- [ ] PROMPT 13: Logika Generator Format Teks & Redirect wa.me

### Tahap 5: Pengujian & Optimasi
- [ ] PROMPT 14: Audit Kinerja (Lighthouse Mobile: Target Skor > 90, Loading < 2s pada 4G)
- [ ] PROMPT 15: Uji Kompatibilitas Tautan WhatsApp (Android, iOS, Web)