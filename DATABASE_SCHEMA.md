## 4. Pembaruan Keamanan & Storage (2026-11-17)
- **RLS Multi-Tenant Ketat:** Seluruh tabel (`users`, `stores`, `categories`, `products`) mengaktifkan Row Level Security. Role `anon` hanya memiliki hak `SELECT` pada toko dan produk dengan `is_active = TRUE`.
- **Constraint URL Aman:** Kolom `stores.logo_url` dan `products.image_url` memiliki check constraint `^https://` untuk mencegah injeksi skema berbahaya.
- **Storage Bucket `product-images`:** Dibatasi di level server PostgreSQL hanya untuk MIME type `image/jpeg`, `image/png`, dan `image/webp` dengan ukuran maksimal `2 MB` (2.097.152 bytes) per file, serta isolasi folder per `auth.uid()`.
- **Fungsi Trigger Aman:** Fungsi `handle_updated_at()` dan `handle_new_auth_user()` dikunci dengan `SET search_path = public`.