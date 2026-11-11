
-- 1. Buat tabel stores
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    whatsapp_number VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk pencarian cepat via slug & user_id
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Policy: Pengguna hanya bisa membaca toko miliknya sendiri di area admin
CREATE POLICY "Pengguna dapat melihat toko miliknya"
ON public.stores
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Pengguna hanya bisa mendaftarkan toko dengan ID miliknya
CREATE POLICY "Pengguna dapat membuat toko miliknya"
ON public.stores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Pengguna hanya bisa memperbarui toko miliknya
CREATE POLICY "Pengguna dapat mengedit toko miliknya"
ON public.stores
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);