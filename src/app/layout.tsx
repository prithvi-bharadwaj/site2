import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

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
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mono.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Prithvi",
              url: "https://prithvi.me",
              jobTitle: "Software Developer",
              description: "Developer, creator, explorer.",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="font-mono">
        {children}
      </body>
    </html>
  );
}
