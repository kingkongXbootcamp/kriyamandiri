-- ============================================================================
-- PROYEK: KRIYAMANDIRI
-- DESKRIPSI: Penguatan Keamanan Database (RLS), Trigger Search Path, & Bucket
-- ============================================================================

-- 1. Amankan search_path pada fungsi SECURITY DEFINER & Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN INSERT INTO public.users (id, email, full_name) VALUES ( NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', '') ) ON CONFLICT (id) DO NOTHING; RETURN NEW; END; $$;

-- 2. Validasi level database untuk mencegah URL berbahaya (javascript: / data:)
ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS check_stores_logo_https;
ALTER TABLE public.stores
  ADD CONSTRAINT check_stores_logo_https
  CHECK (logo_url IS NULL OR logo_url = '' OR logo_url ~ '^https://');

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS check_products_image_https;
ALTER TABLE public.products
  ADD CONSTRAINT check_products_image_https
  CHECK (image_url IS NULL OR image_url = '' OR image_url ~ '^https://');

-- 3. Pastikan Row Level Security (RLS) AKTIF di seluruh tabel
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Cabut hak tulis dari role anon (publik hanya boleh SELECT)
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.stores FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.products TO authenticated;

-- 4. Reset & Tegakkan Policy RLS Ketat pada public.stores
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
DROP POLICY IF EXISTS "Publik dapat melihat profil toko" ON public.stores;
DROP POLICY IF EXISTS "Owners can view their own store regardless of status" ON public.stores;
DROP POLICY IF EXISTS "Pengguna dapat melihat toko miliknya" ON public.stores;
DROP POLICY IF EXISTS "Owners can insert their store" ON public.stores;
DROP POLICY IF EXISTS "Pengguna dapat membuat toko miliknya" ON public.stores;
DROP POLICY IF EXISTS "Owners can update their own store" ON public.stores;
DROP POLICY IF EXISTS "Pengguna dapat mengedit toko miliknya" ON public.stores;
DROP POLICY IF EXISTS "Owners can delete their own store" ON public.stores;

CREATE POLICY "Public can view active stores"
  ON public.stores FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY "Owners can view their own store"
  ON public.stores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert their own store"
  ON public.stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their own store"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their own store"
  ON public.stores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Reset & Tegakkan Policy RLS Ketat pada public.products
DROP POLICY IF EXISTS "Public can view products of active stores" ON public.products;
DROP POLICY IF EXISTS "Publik dapat melihat produk aktif" ON public.products;
DROP POLICY IF EXISTS "Owners can view all their own products" ON public.products;
DROP POLICY IF EXISTS "Pemilik toko dapat melihat produk miliknya" ON public.products;
DROP POLICY IF EXISTS "Owners can insert products into their store" ON public.products;
DROP POLICY IF EXISTS "Pemilik toko dapat menambah produk" ON public.products;
DROP POLICY IF EXISTS "Owners can update products in their store" ON public.products;
DROP POLICY IF EXISTS "Pemilik toko dapat mengedit produk miliknya" ON public.products;
DROP POLICY IF EXISTS "Owners can delete products in their store" ON public.products;
DROP POLICY IF EXISTS "Pemilik toko dapat menghapus produk miliknya" ON public.products;

CREATE POLICY "Public can view active products of active stores"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND stores.is_active = TRUE
    )
  );

CREATE POLICY "Owners can view all their own products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert products into their own store"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update products in their own store"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete products in their own store"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
  );

-- 6. Kunci Bucket Storage 'product-images' (Hanya JPG/PNG/WebP & Maks 2MB)
UPDATE storage.buckets
SET
  public = TRUE,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'product-images';