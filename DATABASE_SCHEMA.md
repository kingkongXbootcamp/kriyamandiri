# DATABASE_SCHEMA.md - KRIYAMANDIRI

Dokumentasi struktur tabel PostgreSQL (Supabase), relasi antar-tabel, indeks, dan aturan keamanan _Row Level Security_ (RLS).

---

## 1. Diagram Relasi Entitas (ERD)

```text
auth.users (Supabase Auth)
   │ 1
   │
   ▼ 1 (user_id UNIQUE, ON DELETE CASCADE)
public.stores
   ├──► 1:N ──► public.products (store_id, ON DELETE CASCADE)
   ├──► 1:N ──► public.orders (store_id, ON DELETE CASCADE)
   └──► 1:N ──► public.shipments (store_id, ON DELETE CASCADE)
                    ▲
                    │ 1:1 (order_id UNIQUE, ON DELETE CASCADE)
public.orders ──────┴──► 1:N ──► public.order_items (order_id, ON DELETE CASCADE)
```
