import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  init: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthog,
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_APP_RELEASE", "test-release");
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = "crumb-cookie-choice=; Max-Age=0; Path=/";
  document.cookie = "crumb-game-save=; Max-Age=0; Path=/";
  document.cookie = "ph_legacy=; Max-Age=0; Path=/";
});

describe("analytics", () => {
  it("queues early events until the asynchronous client is ready", async () => {
    const { captureAnalyticsEvent, configureAnalyticsClient } = await import(
      "@/lib/analytics"
    );

    captureAnalyticsEvent("early_event", { source: "startup" });
    expect(posthog.capture).not.toHaveBeenCalled();

    configureAnalyticsClient(posthog as never);
    expect(posthog.capture).toHaveBeenCalledWith(
      "early_event",
      expect.objectContaining({
        source: "startup",
        analytics_mode: "cookieless",
      })
    );
  });

  it("keeps atomic actions separate from outcomes and passive signals", async () => {
    const { configureAnalyticsClient, trackInteraction } = await import(
      "@/lib/analytics"
    );
    configureAnalyticsClient(posthog as never);

    trackInteraction("control_activated", { section: "theme" });
    trackInteraction("theme_changed", { theme: "dark" });
    trackInteraction("scroll_depth_reached", { percent: 75 });

    expect(posthog.capture).toHaveBeenNthCalledWith(
      1,
      "site_interaction",
      expect.objectContaining({
        interaction: "control_activated",
        analytics_mode: "cookieless",
        app_environment: "test",
        app_release: "test-release",
      })
    );
    expect(posthog.capture).toHaveBeenNthCalledWith(
      2,
      "site_outcome",
      expect.objectContaining({ interaction: "theme_changed" })
    );
    expect(posthog.capture).toHaveBeenNthCalledWith(
      3,
      "site_signal",
      expect.objectContaining({ interaction: "scroll_depth_reached" })
    );
  });

  it("initializes PostHog in cookieless mode with replay disabled", async () => {
    await import("@/instrumentation-client");
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalled());

    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "/garden",
        ui_host: "https://us.posthog.com",
        cookieless_mode: "always",
        disable_session_recording: true,
        person_profiles: "never",
        capture_pageview: "history_change",
        capture_pageleave: true,
      })
    );

    const config = posthog.init.mock.calls[0]?.[1] as {
      before_send: (event: {
        properties: Record<string, unknown>;
      }) => { properties: Record<string, unknown> };
    };
    const event = config.before_send({ properties: { existing: true } });
    expect(event.properties).toEqual(
      expect.objectContaining({
        existing: true,
        analytics_mode: "cookieless",
        app_environment: "test",
        app_release: "test-release",
      })
    );
  });

  it("removes legacy PostHog and cookie-consent persistence on startup", async () => {
    localStorage.setItem("ph_legacy", "old-id");
    sessionStorage.setItem("ph_session", "old-session");
    document.cookie = "ph_legacy=old; Path=/";
    document.cookie = "crumb-cookie-choice=accepted; Path=/";
    document.cookie = "crumb-game-save=old; Path=/";

    await import("@/instrumentation-client");
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalled());

    expect(localStorage.getItem("ph_legacy")).toBeNull();
    expect(sessionStorage.getItem("ph_session")).toBeNull();
    expect(document.cookie).not.toContain("ph_legacy=");
    expect(document.cookie).not.toContain("crumb-cookie-choice=");
    expect(document.cookie).not.toContain("crumb-game-save=");
  });
});
