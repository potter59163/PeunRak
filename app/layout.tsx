import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "เพื่อนรัก",
  description: "คุยได้ก่อนจะบอกใคร แล้วพาไปหาคนที่ช่วยได้จริง — สะพาน ไม่ใช่ปลายทาง",
};

export const viewport: Viewport = {
  themeColor: "#F4F8FE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={plexThai.variable} data-theme="light">
      <body className="th min-h-dvh antialiased">{children}</body>
    </html>
  );
}
