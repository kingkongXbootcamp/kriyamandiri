-- 1. Kebijakan RLS: Pemilik toko hanya bisa menambah produk ke tokonya sendiri
CREATE POLICY "Pemilik toko dapat menambah produk"
ON public.products
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
);

-- 2. Kebijakan RLS: Pemilik toko hanya bisa mengedit produk miliknya sendiri
CREATE POLICY "Pemilik toko dapat mengedit produk miliknya"
ON public.products
FOR UPDATE
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

-- 3. Kebijakan RLS: Pemilik toko hanya bisa menghapus produk miliknya sendiri
CREATE POLICY "Pemilik toko dapat menghapus produk miliknya"
ON public.products
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
);

-- 4. Buat bucket publik untuk foto produk
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Kebijakan Storage: Publik dapat melihat foto produk
CREATE POLICY "Publik dapat melihat foto produk"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- 6. Kebijakan Storage: Pengguna terautentikasi dapat mengunggah ke foldernya sendiri
CREATE POLICY "Pengguna dapat mengunggah foto produk miliknya"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. Kebijakan Storage: Pengguna dapat memperbarui/menghapus foto miliknya
CREATE POLICY "Pengguna dapat mengubah foto produk miliknya"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);