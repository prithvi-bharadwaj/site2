#!/usr/bin/env node
// Capture hover-preview screenshots for the homepage list.
// Each shot waits ~5s after page load so loading effects settle.
//
// Run: npm run screenshots
// One-time browser install: npx playwright install chromium

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "screenshots");

const SHOTS = [
  { name: "roam", url: "https://roam.lol" },
  { name: "roam-info", url: "https://roam.lol/info" },
  { name: "voodoo", url: "https://www.voodoo.io" },
  { name: "supersonic", url: "https://www.supersonic.com" },
  { name: "skive", url: "https://www.skive.in" },
];

const VIEWPORT = { width: 1280, height: 720 };
const SETTLE_MS = 5000;

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    process.stdout.write(`capturing ${shot.name}… `);
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    try {
      await page.goto(shot.url, { waitUntil: "load", timeout: 30_000 });
      await page.waitForTimeout(SETTLE_MS);
      await page.screenshot({
        path: join(OUT, `${shot.name}.png`),
        fullPage: false,
      });
      console.log("ok");
    } catch (err) {
      console.log(`failed: ${err.message}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
