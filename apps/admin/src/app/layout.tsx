import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaundroQR — Kurumsal Çamaşırhane Yönetim Paneli",
  description:
    "Üniversite, KYK ve özel öğrenci yurtları için QR kod tabanlı akıllı çamaşırhane yönetim ve takip platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
