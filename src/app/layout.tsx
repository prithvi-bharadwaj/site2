import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PromptInjection } from "@/components/PromptInjection";
import { HoverCard } from "@/components/HoverCard";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <script
          // Apply the stored theme before paint to avoid a light flash.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("prithvi-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Prithvi",
              url: "https://prithvibharadwaj.com",
              description:
                "Builder. Previously CTO of Applied Reality (Roam), an applied AI lab in SF.",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="font-sans">
        <AnalyticsTracker />
        <PromptInjection />
        {children}
        <HoverCard />
      </body>
    </html>
  );
}
