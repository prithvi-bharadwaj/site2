#!/usr/bin/env node

const isProduction = process.env.VERCEL_ENV === "production";
const hasToken = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);

if (isProduction && !hasToken) {
  console.error(
    "Production analytics is not configured: set NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN in Vercel."
  );
  process.exit(1);
}

if (!hasToken) {
  console.log("Analytics token not set; analytics will remain disabled for this build.");
}
