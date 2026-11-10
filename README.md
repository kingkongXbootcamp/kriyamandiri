# KRIYAMANDIRI
![Vercel](https://vercelbadge.vercel.app/api/kingkongXbootcamp/kriyamandiri)

Platform web katalog online mobile-first untuk UMKM Indonesia dengan pemesanan langsung terintegrasi ke WhatsApp.

## Prasyarat Lingkungan
- Node.js versi 18.18.0 atau yang lebih baru (disarankan Node.js 20 LTS).
- NPM, Yarn, atau PNPM.

## Panduan Instalasi & Menjalankan Proyek

1. ## Clone repository dan masuk ke direktori:
   ```bash
   git clone <repo-url>
   cd kriyamandiri

2. ## Install dependencies:
   ```bash
   npm install

3. ## Setup Environment Variables:
    Environment Variables
   
   Buat file `.env.local` di root proyek dan tambahkan variabel berikut (ambil dari dashboard Supabase kamu):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. ## Jalankan proyek:

   ```bash
   npm run dev
   Buka http://localhost:3000 di browser