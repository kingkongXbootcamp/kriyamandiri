-- ============================================================================
-- PROYEK: KRIYAMANDIRI (MVP BULAN 1)
-- DESKRIPSI: Skema Database Relasional, Indeks, Triggers, & RLS Policies
-- ============================================================================

-- Pastikan ekstensi UUID aktif
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. FUNGSI UTILITAS UMUM: Auto-update updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. TABEL: users (Profil Publik yang Tersinkronisasi dengan auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger auto-update updated_at pada users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3. TABEL: stores (Identitas Toko & Integrasi WhatsApp)
-- ----------------------------------------------------------------------------
-- Aturan Bisnis MVP Bulan 1: 1 User = 1 Toko (Ditegakkan oleh UNIQUE pada user_id)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL CHECK (char_length(TRIM(name)) >= 3),
    slug VARCHAR(60) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    whatsapp_number VARCHAR(20) NOT NULL CHECK (whatsapp_number ~ '^628[0-9]{8,13}$'),
    description VARCHAR(160) DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger auto-update updated_at pada stores
CREATE TRIGGER trigger_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. TABEL: categories (Pengelompokan Menu Opsional Ringan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(40) NOT NULL CHECK (char_length(TRIM(name)) >= 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_store_category UNIQUE (store_id, name)
);

-- ----------------------------------------------------------------------------
-- 5. TABEL: products (Katalog Barang & Status Ketersediaan Stok)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL CHECK (char_length(TRIM(name)) >= 2),
    description VARCHAR(500) DEFAULT '',
    price NUMERIC(12, 0) NOT NULL CHECK (price >= 0),
    image_url TEXT DEFAULT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger auto-update updated_at pada products
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. PENGINDEKSAN STRATEGIS (Optimasi Read Query Katalog Publik)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_catalog_query ON public.products(store_id, is_available);

-- ----------------------------------------------------------------------------
-- 7. TRIGGER OTOMATISASI AUTH: Sinkronisasi Akun Baru ke public.users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$ BEGIN INSERT INTO public.users (id, email, full_name) VALUES ( NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', '') ); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & ISOLASI AKSES MULTI-TENANT
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: USERS
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Kebijakan Akses: STORES
CREATE POLICY "Public can view active stores"
    ON public.stores FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Owners can view their own store regardless of status"
    ON public.stores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert their store"
    ON public.stores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their own store"
    ON public.stores FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their own store"
    ON public.stores FOR DELETE
    USING (auth.uid() = user_id);

-- Kebijakan Akses: CATEGORIES
CREATE POLICY "Public can view categories of active stores"
    ON public.categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = categories.store_id AND stores.is_active = TRUE
        )
    );

CREATE POLICY "Owners can manage their store categories"
    ON public.categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()
        )
    );

-- Kebijakan Akses: PRODUCTS
CREATE POLICY "Public can view products of active stores"
    ON public.products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = products.store_id AND stores.is_active = TRUE
        )
    );

CREATE POLICY "Owners can view all their own products"
    ON public.products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = products.store_id AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can insert products into their store"
    ON public.products FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = products.store_id AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update products in their store"
    ON public.products FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = products.store_id AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can delete products in their store"
    ON public.products FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = products.store_id AND stores.user_id = auth.uid()
        )
    );