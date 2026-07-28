import { StrictMode } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { XpHud } from "@/components/XpHud";

const analytics = vi.hoisted(() => ({
  captureAnalyticsEvent: vi.fn(),
  trackInteraction: vi.fn(),
}));

vi.mock("@/lib/analytics", () => analytics);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("XpHud", () => {
  it("emits exactly one toggle event per click, even under StrictMode re-runs", () => {
    const { getByTitle } = render(
      <StrictMode>
        <XpHud />
      </StrictMode>
    );

    fireEvent.click(getByTitle("progress"));

    expect(analytics.trackInteraction).toHaveBeenCalledTimes(1);
    expect(analytics.trackInteraction).toHaveBeenCalledWith("xp_hud_opened", {
      reason: "toggle",
    });

    fireEvent.click(getByTitle("progress"));

    expect(analytics.trackInteraction).toHaveBeenCalledTimes(2);
    expect(analytics.trackInteraction).toHaveBeenLastCalledWith(
      "xp_hud_closed",
      { reason: "toggle" }
    );
  });
});
