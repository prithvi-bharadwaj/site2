import {
  analyticsContext,
  configureAnalyticsClient,
} from "@/lib/analytics";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/garden";
const uiHost =
  process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com";

function clearLegacyTrackingState() {
  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key?.startsWith("ph_")) storage.removeItem(key);
      }
    }
  } catch {
    // Storage can be unavailable in hardened/private browsing contexts.
  }

  try {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (
        name?.startsWith("ph_") ||
        name === "crumb-cookie-choice" ||
        name === "crumb-game-save"
      ) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      }
    }
  } catch {
    // Cookie access can be blocked without affecting cookieless capture.
  }
}

clearLegacyTrackingState();

if (token) {
  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(token, {
        api_host: host,
        ui_host: uiHost,
        defaults: "2026-05-30",
        cookieless_mode: "always",
        autocapture: true,
        rageclick: true,
        capture_pageview: "history_change",
        capture_pageleave: true,
        capture_exceptions: true,
        capture_performance: true,
        opt_out_useragent_filter:
          process.env.NEXT_PUBLIC_ANALYTICS_ALLOW_BOTS === "true",
        person_profiles: "never",
        disable_session_recording: true,
        disable_surveys: true,
        mask_personal_data_properties: true,
        before_send: (event) => {
          if (!event) return null;
          event.properties = {
            ...analyticsContext(),
            ...event.properties,
          };
          return event;
        },
      });
      configureAnalyticsClient(posthog);
    })
    .catch((error) => {
      console.error("Analytics failed to initialize", error);
    });
}
