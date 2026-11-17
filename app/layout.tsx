import type { Metadata, Viewport } from "next";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "KRIYAMANDIRI - Katalog Digital & Order WhatsApp UMKM",
  description:
    "Platform web katalog online praktis untuk UMKM Indonesia. Terima pesanan langsung ke WhatsApp tanpa potongan komisi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}