import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ControlPanel } from "@/components/ControlPanel";

afterEach(cleanup);

class StubObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver ||= StubObserver as unknown as typeof IntersectionObserver;

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as typeof window.matchMedia;
}

function renderOpenDock() {
  const target = document.createElement("div");
  target.id = "lore";
  target.scrollIntoView = vi.fn();
  document.body.appendChild(target);
  render(
    <ControlPanel
      sections={[{ id: "lore", label: "lore" }]}
      genz={false}
      onGenzChange={() => {}}
    />
  );
  fireEvent.click(screen.getByTitle("sitemap + controls"));
  fireEvent.click(screen.getByRole("button", { name: "lore" }));
  return target;
}

describe("ControlPanel", () => {
  it("jumps without the scroll animation under reduced motion", () => {
    mockReducedMotion(true);
    const target = renderOpenDock();
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
    target.remove();
  });

  it("scrolls smoothly when motion is fine", () => {
    mockReducedMotion(false);
    const target = renderOpenDock();
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    target.remove();
  });
});
