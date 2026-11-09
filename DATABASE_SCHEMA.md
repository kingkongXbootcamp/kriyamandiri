# DATABASE SCHEMA - KRIYAMANDIRI (MVP BULAN 1)

## 1. Diagram Relasi Entitas (ERD)

```text
auth.users (Supabase Auth)
       │ (1:1 via ID)
       ▼
  public.users
       │
       │ (1:1 - One User One Store)
       ▼
  public.stores ───────────┐
       │                   │ (1:N)
       │ (1:N)             ▼
       │             public.categories
       │                   │
       ▼                   ▼ (0..1:N)
  public.products ─────────┘