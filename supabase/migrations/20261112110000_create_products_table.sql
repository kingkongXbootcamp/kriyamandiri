-- 1. Buat tabel products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 0) NOT NULL DEFAULT 0,
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true, -- true = Produk Aktif, false = Produk Habis
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk mempercepat query statistik berdasarkan store_id dan status stok
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_availability ON public.products(store_id, is_available);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Pemilik toko hanya dapat membaca data produk miliknya sendiri
CREATE POLICY "Pemilik toko dapat melihat produk miliknya"
ON public.products
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = products.store_id
        AND stores.user_id = auth.uid()
    )
);