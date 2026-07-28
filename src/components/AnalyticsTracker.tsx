"use client";

import { useEffect } from "react";
import { trackInteraction } from "@/lib/analytics";

const ENGAGEMENT_SECONDS = [15, 30, 60, 120, 300] as const;
const SCROLL_DEPTHS = [25, 50, 75, 100] as const;
const IDLE_AFTER_MS = 30_000;

function cleanLabel(element: HTMLElement) {
  return (
    element.dataset.analyticsTarget ||
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.textContent ||
    element.tagName.toLowerCase()
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/**
 * Site-wide behavioral baseline:
 * - every activated link/button/control
 * - active-time milestones (hidden-tab time excluded)
 * - scroll-depth milestones
 *
 * Components additionally send named state/outcome events (expanded, pinned,
 * accepted, unlocked, and so on) so a click and its result can be separated.
 */
export function AnalyticsTracker() {
  useEffect(() => {
    let trackedPointer = false;
    const onPointerMove = (event: PointerEvent) => {
      if (trackedPointer) return;
      trackedPointer = true;
      trackInteraction("pointer_exploration_started", {
        pointer_type: event.pointerType,
      });
      window.removeEventListener("pointermove", onPointerMove);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>(
        "a,button,[role='button'],[role='switch'],[data-analytics-target]"
      );
      if (!control || control.closest(".ph-no-capture")) return;

      const anchor = control.closest<HTMLAnchorElement>("a");
      const section =
        control.closest<HTMLElement>("[data-analytics-section]")?.dataset
          .analyticsSection ?? "global";

      trackInteraction(anchor ? "link_activated" : "control_activated", {
        section,
        label: cleanLabel(control),
        href: anchor?.href,
        control_type: anchor
          ? "link"
          : control.getAttribute("role") ?? control.tagName.toLowerCase(),
        pointer_type: event.detail === 0 ? "keyboard" : "pointer",
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    let visibleSeconds = 0;
    let nextIndex = 0;
    let lastActivityAt = performance.now();
    const recordActivity = () => {
      lastActivityAt = performance.now();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (performance.now() - lastActivityAt > IDLE_AFTER_MS) return;
      visibleSeconds += 1;
      const milestone = ENGAGEMENT_SECONDS[nextIndex];
      if (milestone && visibleSeconds >= milestone) {
        trackInteraction("visible_time_reached", {
          seconds: milestone,
        });
        nextIndex += 1;
        if (nextIndex === ENGAGEMENT_SECONDS.length) {
          window.clearInterval(timer);
        }
      }
    }, 1000);
    window.addEventListener("pointerdown", recordActivity, { passive: true });
    window.addEventListener("pointermove", recordActivity, { passive: true });
    window.addEventListener("keydown", recordActivity);
    window.addEventListener("scroll", recordActivity, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", recordActivity);
      window.removeEventListener("pointermove", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("scroll", recordActivity);
    };
  }, []);

  useEffect(() => {
    const reached = new Set<number>();
    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const depth = Math.min(100, (window.scrollY / maxScroll) * 100);
      for (const milestone of SCROLL_DEPTHS) {
        if (depth >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          trackInteraction("scroll_depth_reached", {
            percent: milestone,
          });
        }
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
