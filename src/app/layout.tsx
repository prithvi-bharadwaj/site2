import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prithvi",
  description: "Developer, creator, explorer.",
  openGraph: {
    title: "Prithvi",
    description: "Developer, creator, explorer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prithvi",
    description: "Developer, creator, explorer.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
