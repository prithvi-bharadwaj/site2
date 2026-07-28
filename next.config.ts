import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_ENV:
      process.env.NEXT_PUBLIC_APP_ENV ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "unknown",
    NEXT_PUBLIC_APP_RELEASE:
      process.env.NEXT_PUBLIC_APP_RELEASE ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      "local",
  },
  async rewrites() {
    return [
      {
        source: "/garden/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/garden/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/garden/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
