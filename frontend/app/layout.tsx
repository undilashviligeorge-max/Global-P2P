import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "P2P გზავნილი",
  description: "EUR → GEL / USD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" className="dark">
      <body>{children}</body>
    </html>
  );
}
