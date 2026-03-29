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
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
      <body style={{ fontFamily: "'Red Hat Display', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
