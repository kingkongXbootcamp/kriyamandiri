import React from "react";
import { getSellerDashboardData } from "@/actions/dashboard";
import SellerDashboard from "@/components/SellerDashboard";

export const metadata = {
  title: "Dashboard Penjual | KRIYAMANDIRI",
  description: "Kelola katalog online dan tautan pesanan WhatsApp toko Anda.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboardData = await getSellerDashboardData();

  return <SellerDashboard data={dashboardData} />;
}