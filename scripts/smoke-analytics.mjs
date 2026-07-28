#!/usr/bin/env node

import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 3217;
const baseUrl = `http://127.0.0.1:${port}`;
const analyticsRequests = [];

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--turbopack", "-p", String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_browser_smoke_test",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_APP_ENV: "browser-smoke",
      NEXT_PUBLIC_APP_RELEASE: "browser-smoke",
      NEXT_PUBLIC_ANALYTICS_ALLOW_BOTS: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before startup.\n${serverOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Server is still warming up.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}.\n${serverOutput}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const browserMessages = [];
  page.on("console", (message) => {
    browserMessages.push(`[${message.type()}] ${message.text()}`);
  });
  page.on("pageerror", (error) => browserMessages.push(`[pageerror] ${error.message}`));

  await page.route(/https:\/\/(us\.i|us-assets\.i)\.posthog\.com\/.*/, async (route) => {
    const request = route.request();
    const isAsset = new URL(request.url()).hostname === "us-assets.i.posthog.com";
    if (isAsset) {
      const isScript = request.resourceType() === "script";
      await route.fulfill({
        status: 200,
        contentType: isScript ? "application/javascript" : "application/json",
        body: isScript ? "" : "{}",
      });
      return;
    }
    if (request.method() === "POST") {
      analyticsRequests.push({
        url: request.url(),
        body: request.postData() ?? "",
      });
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
      },
      body: JSON.stringify({ flags: {}, payloads: {} }),
    });
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.readyState !== "loading");
  await page.waitForTimeout(1_000);

  const requestsBeforeAction = analyticsRequests.length;
  await page.getByRole("button", { name: /switch to dark mode/i }).click();
  await page.waitForTimeout(4_000);

  if (analyticsRequests.length <= requestsBeforeAction) {
    const runtimeState = await page.evaluate(() => {
      const client = window.posthog;
      return client
        ? {
            loaded: client.__loaded,
            cookielessMode: client.config?.cookieless_mode,
            optedOut: client.has_opted_out_capturing?.(),
            distinctId: client.get_distinct_id?.(),
          }
        : { loaded: false };
    });
    throw new Error(
      `No PostHog requests were emitted by the real browser client. Runtime: ${JSON.stringify(
        runtimeState
      )}. Browser errors: ${JSON.stringify(browserMessages)}`
    );
  }

  const persistedPostHogState = await page.evaluate(() => ({
    local: Object.keys(localStorage).filter((key) => key.startsWith("ph_")),
    session: Object.keys(sessionStorage).filter((key) => key.startsWith("ph_")),
    cookies: document.cookie
      .split(";")
      .map((part) => part.trim().split("=")[0])
      .filter((key) => key.startsWith("ph_")),
  }));

  if (
    persistedPostHogState.local.length ||
    persistedPostHogState.session.length ||
    persistedPostHogState.cookies.length
  ) {
    throw new Error(
      `Cookieless smoke test found PostHog persistence: ${JSON.stringify(
        persistedPostHogState
      )}`
    );
  }

  const combinedBodies = analyticsRequests.map((request) => request.body).join("\n");
  if (!combinedBodies.includes("site_interaction")) {
    throw new Error(
      `PostHog requests were emitted, but the named site_interaction was not found: ${JSON.stringify(
        analyticsRequests.map((request) => ({
          url: request.url,
          body: request.body.slice(0, 240),
        }))
      )}`
    );
  }

  console.log(
    `Analytics browser smoke passed (${analyticsRequests.length} intercepted requests, no PostHog persistence).`
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
