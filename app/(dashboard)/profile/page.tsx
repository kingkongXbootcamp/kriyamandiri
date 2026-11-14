import React from "react";
import Link from "next/link";
import { getCurrentUserStore } from "@/actions/store";
import StoreProfileForm from "@/components/StoreProfileForm";

export const metadata = {
  title: "Profil Toko | KRIYAMANDIRI",
  description: "Atur nama toko, tautan katalog, dan nomor WhatsApp penerima pesanan.",
};

export const dynamic = "force-dynamic";

export default async function StoreProfilePage() {
  const existingStore = await getCurrentUserStore();

  return (
    <div className="space-y-4">
      {/* Tombol Kembali ke Dashboard */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Form Pendaftaran / Edit Profil Toko */}
      <StoreProfileForm initialData={existingStore} />
    </div>
  );
}