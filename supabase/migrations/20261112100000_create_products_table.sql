-- 1. Buat tabel produk
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 0) NOT NULL DEFAULT 0,
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true, -- true = Aktif, false = Habis
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk optimasi penghitungan stok toko
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(store_id, is_available);

-- 3. RLS: Hanya pemilik toko yang dapat mengakses dan mengelola produknya
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pemilik toko dapat melihat produknya"
ON public.products
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
);