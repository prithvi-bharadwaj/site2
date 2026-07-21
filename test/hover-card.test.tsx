import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { HoverCard } from "@/components/HoverCard";
import { emitShow, emitHide } from "@/lib/hover-card-bus";

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
});
