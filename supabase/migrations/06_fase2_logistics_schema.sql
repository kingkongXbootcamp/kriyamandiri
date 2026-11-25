-- ============================================================================
-- MIGRASI FASE 2: LOGISTIK (BITESHIP) & MONETISASI - KRIYAMANDIRI
-- File: supabase/migrations/06_fase2_logistics_schema.sql
-- ============================================================================

-- 1. KOLOM TAMBAHAN PADA TABEL STORES (Titik Asal Pengiriman / Pickup Origin)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS origin_area_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS origin_postal_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS origin_address TEXT,
  ADD COLUMN IF NOT EXISTS origin_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS origin_longitude DOUBLE PRECISION;

-- 2. KOLOM TAMBAHAN PADA TABEL PRODUCTS (Berat Satuan dalam Gram)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER NOT NULL DEFAULT 250;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_weight_grams_positive'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_weight_grams_positive CHECK (weight_grams > 0);
  END IF;
END $$;

-- 3. FUNGSI TRIGGER UPDATED_AT OTOMATIS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. TABEL ORDERS (Data Pesanan, Ongkir, & Komisi Platform)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(32) NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_name VARCHAR(100) NOT NULL,
  buyer_whatsapp VARCHAR(20) NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_district VARCHAR(100) NOT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_province VARCHAR(100),
  destination_area_id VARCHAR(100),
  destination_postal_code VARCHAR(10),
  subtotal_amount NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  shipping_cost NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  platform_fee NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  total_amount NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'confirmed',
      'ready_to_ship',
      'shipped',
      'delivered',
      'cancelled'
    )
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_store_id
  ON public.orders(store_id);

CREATE INDEX IF NOT EXISTS idx_orders_store_created
  ON public.orders(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_order_code
  ON public.orders(order_code);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders(store_id, status);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. TABEL ORDER_ITEMS (Rincian & Snapshot Produk per Pesanan)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name VARCHAR(150) NOT NULL,
  unit_price NUMERIC(12, 0) NOT NULL CHECK (unit_price >= 0),
  weight_grams INTEGER NOT NULL DEFAULT 250 CHECK (weight_grams > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(12, 0) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items(product_id);

-- 6. TABEL SHIPMENTS (Kurir Terpilih, Resi/Waybill, & Tracking Biteship)
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL DEFAULT 'biteship',
  courier_company VARCHAR(50) NOT NULL,
  courier_type VARCHAR(50) NOT NULL,
  courier_name VARCHAR(100) NOT NULL,
  estimated_delivery VARCHAR(50),
  total_weight_grams INTEGER NOT NULL DEFAULT 250 CHECK (total_weight_grams > 0),
  shipping_cost NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  platform_commission NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (platform_commission >= 0),
  biteship_order_id VARCHAR(100) UNIQUE,
  biteship_tracking_id VARCHAR(100),
  waybill_id VARCHAR(100),
  label_url TEXT,
  shipment_status VARCHAR(40) NOT NULL DEFAULT 'quote_selected' CHECK (
    shipment_status IN (
      'quote_selected',
      'confirmed',
      'allocated',
      'picking_up',
      'picked',
      'dropping_off',
      'delivered',
      'cancelled',
      'returned',
      'disposed'
    )
  ),
  tracking_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_response JSONB,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_store_id
  ON public.shipments(store_id);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id
  ON public.shipments(order_id);

CREATE INDEX IF NOT EXISTS idx_shipments_store_status
  ON public.shipments(store_id, shipment_status);

CREATE INDEX IF NOT EXISTS idx_shipments_waybill_id
  ON public.shipments(waybill_id);

CREATE INDEX IF NOT EXISTS idx_shipments_biteship_order_id
  ON public.shipments(biteship_order_id);

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. HAK AKSES ROLE & AKTIVASI ROW LEVEL SECURITY (RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON TABLE public.orders, public.order_items, public.shipments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders, public.order_items, public.shipments TO authenticated;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES TABEL ORDERS
DROP POLICY IF EXISTS "Publik dapat membuat pesanan baru" ON public.orders;
CREATE POLICY "Publik dapat membuat pesanan baru"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
  )
);

DROP POLICY IF EXISTS "Pemilik toko dapat melihat pesanannya" ON public.orders;
CREATE POLICY "Pemilik toko dapat melihat pesanannya"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Pemilik toko dapat memperbarui status pesanannya" ON public.orders;
CREATE POLICY "Pemilik toko dapat memperbarui status pesanannya"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Pemilik toko dapat menghapus pesanannya" ON public.orders;
CREATE POLICY "Pemilik toko dapat menghapus pesanannya"
ON public.orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id
    AND stores.user_id = auth.uid()
  )
);

-- 9. POLICIES TABEL ORDER_ITEMS
DROP POLICY IF EXISTS "Publik dapat menyimpan item pesanan" ON public.order_items;
CREATE POLICY "Publik dapat menyimpan item pesanan"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
  )
);

DROP POLICY IF EXISTS "Pemilik toko dapat melihat item pesanannya" ON public.order_items;
CREATE POLICY "Pemilik toko dapat melihat item pesanannya"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders
    JOIN public.stores ON stores.id = orders.store_id
    WHERE orders.id = order_items.order_id
    AND stores.user_id = auth.uid()
  )
);

-- 10. POLICIES TABEL SHIPMENTS
DROP POLICY IF EXISTS "Publik dapat membuat data pengiriman awal" ON public.shipments;
CREATE POLICY "Publik dapat membuat data pengiriman awal"
ON public.shipments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = shipments.order_id
    AND orders.store_id = shipments.store_id
  )
);

DROP POLICY IF EXISTS "Pemilik toko dapat melihat pengiriman tokonya" ON public.shipments;
CREATE POLICY "Pemilik toko dapat melihat pengiriman tokonya"
ON public.shipments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = shipments.store_id
    AND stores.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Pemilik toko dapat memperbarui pengiriman tokonya" ON public.shipments;
CREATE POLICY "Pemilik toko dapat memperbarui pengiriman tokonya"
ON public.shipments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = shipments.store_id
    AND stores.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = shipments.store_id
    AND stores.user_id = auth.uid()
  )
);

-- 11. FUNGSI RPC CEK RESI PUBLIK AMAN (Tanpa Membocorkan Alamat/WA Pembeli)
CREATE OR REPLACE FUNCTION public.get_public_shipment_tracking(p_query TEXT)
RETURNS TABLE (
  order_code VARCHAR,
  store_name VARCHAR,
  courier_name VARCHAR,
  waybill_id VARCHAR,
  shipment_status VARCHAR,
  estimated_delivery VARCHAR,
  tracking_history JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_query TEXT := UPPER(TRIM(COALESCE(p_query, '')));
BEGIN
  IF LENGTH(v_clean_query) < 5 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.order_code,
    st.name AS store_name,
    sh.courier_name,
    sh.waybill_id,
    sh.shipment_status,
    sh.estimated_delivery,
    sh.tracking_history,
    sh.updated_at
  FROM public.shipments sh
  JOIN public.orders o ON o.id = sh.order_id
  JOIN public.stores st ON st.id = sh.store_id
  WHERE UPPER(o.order_code) = v_clean_query
     OR UPPER(COALESCE(sh.waybill_id, '')) = v_clean_query
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_shipment_tracking(TEXT) TO anon, authenticated;