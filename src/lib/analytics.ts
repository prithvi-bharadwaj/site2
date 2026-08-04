"use client";

import type { PostHog } from "posthog-js";

export type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsProperties = Record<string, AnalyticsValue>;

export type InteractionName =
  | "content_edit_finished"
  | "content_edit_started"
  | "control_activated"
  | "cookie_dialog_closed"
  | "cookie_dialog_opened"
  | "cookie_game_choice_selected"
  | "cookie_pet_tapped"
  | "edited_content_copied"
  | "edited_content_reset"
  | "edited_content_saved"
  | "edit_mode_changed"
  | "error_retry_clicked"
  | "exit_gate_dismissed"
  | "exit_gate_shown"
  | "genz_mode_changed"
  | "genz_video_dismissed"
  | "intro_reveal_finished"
  | "link_activated"
  | "list_item_collapsed"
  | "list_item_expanded"
  | "locked_contact_clicked"
  | "pointer_exploration_started"
  | "preview_opened"
  | "preview_pinned"
  | "preview_unpinned"
  | "proof_inspection_abandoned"
  | "proof_inspection_completed"
  | "scroll_depth_reached"
  | "theme_changed"
  | "visible_time_reached"
  | "xp_hud_closed"
  | "xp_hud_opened"
  | "xp_progress_reset";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const pendingEvents: Array<{
  event: string;
  properties: AnalyticsProperties;
}> = [];
let client: PostHog | null = null;

export function analyticsConfigured() {
  return Boolean(token);
}

export function analyticsContext(): AnalyticsProperties {
  return {
    analytics_mode: "cookieless",
    app_environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.NEXT_PUBLIC_APP_ENV ??
      process.env.NODE_ENV ??
      "unknown",
    app_release:
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      process.env.NEXT_PUBLIC_APP_RELEASE ??
      "local",
  };
}

export function configureAnalyticsClient(nextClient: PostHog) {
  client = nextClient;
  for (const pending of pendingEvents.splice(0)) {
    client.capture(pending.event, pending.properties);
  }
}

export function captureAnalyticsEvent(
  event: string,
  properties: AnalyticsProperties = {}
) {
  if (!analyticsConfigured()) return;
  const eventProperties = {
    ...analyticsContext(),
    ...properties,
  };
  if (!client) {
    if (pendingEvents.length < 50) {
      pendingEvents.push({ event, properties: eventProperties });
    }
    return;
  }
  client.capture(event, eventProperties);
}

/**
 * `site_interaction` is reserved for one atomic visitor action. Component state
 * changes are outcomes, and passive measurements are signals, so neither can
 * inflate the headline actions-per-visitor metric.
 */
const SIGNAL_INTERACTIONS = new Set<InteractionName>([
  "content_edit_started",
  "exit_gate_shown",
  "intro_reveal_finished",
  "pointer_exploration_started",
  "scroll_depth_reached",
  "visible_time_reached",
]);

const OUTCOME_INTERACTIONS = new Set<InteractionName>([
  "content_edit_finished",
  "cookie_dialog_closed",
  "cookie_dialog_opened",
  "cookie_game_choice_selected",
  "cookie_pet_tapped",
  "edited_content_copied",
  "edited_content_reset",
  "edited_content_saved",
  "edit_mode_changed",
  "error_retry_clicked",
  "genz_mode_changed",
  "genz_video_dismissed",
  "list_item_collapsed",
  "list_item_expanded",
  "locked_contact_clicked",
  "preview_pinned",
  "preview_unpinned",
  "proof_inspection_abandoned",
  "proof_inspection_completed",
  "theme_changed",
  "xp_hud_closed",
  "xp_hud_opened",
  "xp_progress_reset",
]);

export function trackInteraction(
  interaction: InteractionName,
  properties: AnalyticsProperties = {}
) {
  const event = SIGNAL_INTERACTIONS.has(interaction)
    ? "site_signal"
    : OUTCOME_INTERACTIONS.has(interaction)
      ? "site_outcome"
      : "site_interaction";

  captureAnalyticsEvent(event, {
    interaction,
    ...properties,
  });
}
