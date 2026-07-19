import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PromptInjection } from "@/components/PromptInjection";
import { HoverCard } from "@/components/HoverCard";

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-fallback",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://prithvibharadwaj.com"),
  title: "Prithvi",
  description: "Developer, creator, explorer.",
  openGraph: {
    title: "Prithvi",
    description: "Developer, creator, explorer.",
    type: "website",
    url: "https://prithvibharadwaj.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prithvi",
    description: "Developer, creator, explorer.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Prithvi",
              url: "https://prithvibharadwaj.com",
              jobTitle: "Software Developer",
              description: "Developer, creator, explorer.",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="font-sans">
        <PromptInjection />
        {children}
        <HoverCard />
      </body>
    </html>
  );
}
