import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({
  captureAnalyticsEvent: vi.fn(),
  trackInteraction: vi.fn(),
}));

vi.mock("@/lib/analytics", () => analytics);

import {
  ACHIEVEMENTS,
  TOTALS,
  award,
  resetXp,
} from "@/lib/xp";

beforeEach(() => {
  resetXp();
  vi.clearAllMocks();
});

describe("XP analytics", () => {
  it("emits every achievement exactly once", () => {
    act(() => {
      for (let index = 0; index < TOTALS.proof; index += 1) {
        award(`proof:${index}`, 10);
      }
      award("lore:Google cheque", 50);
      award("lore:origin story", 50);
      award("lore:third story", 50);
      award("lore-proof:csgo", 10);
      award("lore-proof:dota", 10);
      for (let index = 0; index < TOTALS.writing; index += 1) {
        award(`writing:${index}`, 50);
      }
      award("genz:on", 50);
      award("scroll:bottom", 50);
      award("time:60s", 50);
    });

    const unlocks = analytics.captureAnalyticsEvent.mock.calls.filter(
      ([event]) => event === "achievement_unlocked"
    );
    expect(unlocks).toHaveLength(ACHIEVEMENTS.length);
    expect(new Set(unlocks.map(([, properties]) => properties.achievement_id))).toEqual(
      new Set(ACHIEVEMENTS.map((achievement) => achievement.id))
    );

    act(() => {
      award("genz:on", 50);
      award("scroll:bottom", 50);
      award("time:60s", 50);
    });
    expect(
      analytics.captureAnalyticsEvent.mock.calls.filter(
        ([event]) => event === "achievement_unlocked"
      )
    ).toHaveLength(ACHIEVEMENTS.length);
  });
});
