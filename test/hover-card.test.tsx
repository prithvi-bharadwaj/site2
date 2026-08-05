import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { HoverCard } from "@/components/HoverCard";
import { emitShow, emitHide, emitPin, isPinnedInspect } from "@/lib/hover-card-bus";
import { resetXp } from "@/lib/xp";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HoverCard", () => {
  it("unmounts the YouTube iframe after hide so it stops playing", () => {
    const { container } = render(<HoverCard />);

    act(() => {
      emitShow({ media: { type: "youtube", id: "abc123" }, x: 100, y: 100 });
    });
    expect(container.querySelector("iframe.hover-card-youtube")).not.toBeNull();

    act(() => {
      emitHide();
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector("iframe.hover-card-youtube")).toBeNull();
  });

  it("keeps image media mounted through hide so the fade-out isn't cut", () => {
    const { container } = render(<HoverCard />);

    act(() => {
      emitShow({ media: { type: "image", src: "/x.png" }, x: 100, y: 100 });
    });
    act(() => {
      emitHide();
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector("img.hover-card-img")).not.toBeNull();
  });

  it("cancels the pending unmount when a new show arrives during the fade", () => {
    const { container } = render(<HoverCard />);

    act(() => {
      emitShow({ media: { type: "youtube", id: "abc123" }, x: 100, y: 100 });
      emitHide();
      vi.advanceTimersByTime(100);
      emitShow({ media: { type: "youtube", id: "def456" }, x: 100, y: 100 });
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector("iframe.hover-card-youtube")).not.toBeNull();
  });

  it("renders destination buttons when the pin carries actions", () => {
    const { container } = render(<HoverCard />);

    act(() => {
      emitPin({
        media: { type: "image", src: "/screenshots/roam-gg.png", caption: "roam" },
        href: "https://roam.lol",
        actions: [
          { label: "Generate Games", href: "https://roam.gg" },
          { label: "Landing Page", href: "https://roam.lol" },
        ],
        x: 100,
        y: 100,
      });
    });

    const buttons = [...container.querySelectorAll("a.hover-card-action")];
    expect(buttons.map((b) => b.textContent)).toEqual(["Generate Games", "Landing Page"]);
    expect(buttons.map((b) => b.getAttribute("href"))).toEqual([
      "https://roam.gg",
      "https://roam.lol",
    ]);
    // With explicit buttons the card must not also be one big link.
    expect(container.querySelector("a.hover-card-linkwrap")).toBeNull();
  });

  it("pins into a clickable new-tab link and ignores hide while pinned", () => {
    const { container } = render(<HoverCard />);
    const media = { type: "image" as const, src: "/x.png", caption: "x.com" };

    act(() => {
      emitPin({ media, href: "https://x.com", x: 100, y: 100 });
    });
    const card = container.querySelector(".hover-card")!;
    expect(card.className).toContain("pinned");
    const link = container.querySelector("a.hover-card-linkwrap")!;
    expect(link.getAttribute("href")).toBe("https://x.com");
    // The pinned card is the one deliberate new-tab link: the xp session stays alive here.
    expect(link.getAttribute("target")).toBe("_blank");

    // Hover-out hide events don't dismiss a pinned card.
    act(() => {
      emitHide();
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector(".hover-card")!.className).toContain("visible");

    // Re-pinning the same href toggles it off.
    act(() => {
      emitPin({ media, href: "https://x.com", x: 100, y: 100 });
    });
    expect(container.querySelector(".hover-card")!.className).not.toContain("pinned");
    expect(container.querySelector(".hover-card")!.className).not.toContain("visible");
  });

  it("awards the proof inspection after dwelling on a pinned card (touch path)", () => {
    resetXp();
    render(<HoverCard />);
    const media = { type: "image" as const, src: "/x.png", caption: "x.com" };
    const earned = () =>
      JSON.parse(localStorage.getItem("prithvi-xp-v2") ?? '{"earned":{}}').earned;

    act(() => {
      emitPin({ media, href: "https://x.com", inspectId: "proof:/x.png", x: 100, y: 100 });
      vi.advanceTimersByTime(1000);
    });
    expect(earned()).toHaveProperty(["proof:/x.png"]);

    // Unpinning before the dwell completes cancels the award.
    resetXp();
    act(() => {
      emitPin({ media, href: "https://y.com", inspectId: "proof:/y.png", x: 100, y: 100 });
      vi.advanceTimersByTime(400);
      emitPin({ media, href: "https://y.com", inspectId: "proof:/y.png", x: 100, y: 100 }); // toggle off
      vi.advanceTimersByTime(1000);
    });
    expect(earned()).not.toHaveProperty(["proof:/y.png"]);
    resetXp();
  });

  it("registers the pinned dwell id so source pointerleave can't cancel it", () => {
    resetXp();
    render(<HoverCard />);
    const media = { type: "image" as const, src: "/x.png", caption: "x.com" };

    act(() => {
      emitPin({ media, href: "https://x.com", inspectId: "proof:/x.png", x: 100, y: 100 });
    });
    // While pinned, the source link's pointerleave checks this and skips inspectEnd.
    expect(isPinnedInspect("proof:/x.png")).toBe(true);
    expect(isPinnedInspect("proof:/other.png")).toBe(false);

    act(() => {
      emitPin({ media, href: "https://x.com", inspectId: "proof:/x.png", x: 100, y: 100 }); // toggle off
    });
    expect(isPinnedInspect("proof:/x.png")).toBe(false);
    resetXp();
  });
});
