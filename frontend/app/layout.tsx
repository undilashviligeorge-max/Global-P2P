import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "P2P გზავნილი",
  description: "Web2.5 P2P რემიტანის კალკულატორი",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka">
      <body>{children}</body>
    </html>
  );
}
