import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { trackInteraction } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  trackInteraction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("AnalyticsTracker", () => {
  it("records every activated control with its section and destination", () => {
    const { getByRole } = render(
      <>
        <AnalyticsTracker />
        <section data-analytics-section="writing">
          <a href="https://example.com/article">read the article</a>
        </section>
      </>
    );

    fireEvent.click(getByRole("link", { name: "read the article" }));

    expect(trackInteraction).toHaveBeenCalledWith(
      "link_activated",
      expect.objectContaining({
        section: "writing",
        label: "read the article",
        href: "https://example.com/article",
        control_type: "link",
      })
    );
  });

  it("records the first pointer exploration without emitting per-pixel events", () => {
    render(<AnalyticsTracker />);

    fireEvent.pointerMove(window, { pointerType: "mouse" });
    fireEvent.pointerMove(window, { pointerType: "mouse" });

    expect(trackInteraction).toHaveBeenCalledTimes(1);
    expect(trackInteraction).toHaveBeenCalledWith(
      "pointer_exploration_started",
      { pointer_type: "mouse" }
    );
  });

  it("records visible-time milestones and stops counting after idle", () => {
    vi.useFakeTimers();
    render(<AnalyticsTracker />);

    vi.advanceTimersByTime(60_000);

    expect(trackInteraction).toHaveBeenCalledWith(
      "visible_time_reached",
      { seconds: 15 }
    );
    expect(trackInteraction).toHaveBeenCalledWith(
      "visible_time_reached",
      { seconds: 30 }
    );
    expect(trackInteraction).not.toHaveBeenCalledWith(
      "visible_time_reached",
      { seconds: 60 }
    );
  });
});
