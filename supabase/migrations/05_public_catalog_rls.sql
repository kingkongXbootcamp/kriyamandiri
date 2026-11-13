-- 1. Tambahkan kolom is_active untuk membedakan produk nonaktif (disembunyikan)
--    dengan produk habis (tetap tampil dengan status "Stok Habis")
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Index komposit untuk mempercepat query katalog publik per toko
CREATE INDEX IF NOT EXISTS idx_products_public_catalog
ON public.products(store_id, is_active, created_at DESC);

-- 3. Policy Publik: Pembeli (tanpa login) dapat membaca profil toko berdasarkan slug
CREATE POLICY "Publik dapat melihat profil toko"
ON public.stores
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Policy Publik: Pembeli (tanpa login) hanya dapat melihat produk yang aktif
CREATE POLICY "Publik dapat melihat produk aktif"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);