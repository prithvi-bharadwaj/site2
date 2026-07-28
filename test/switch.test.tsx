import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Switch } from "@/components/Switch";

afterEach(cleanup);

// jsdom has no pointer capture.
window.HTMLElement.prototype.setPointerCapture ||= () => {};

function thumb(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".switch-thumb")!;
}

describe("Switch", () => {
  it("reports its state to assistive tech", () => {
    render(<Switch checked onChange={() => {}} label="gravity" />);
    const el = screen.getByRole("switch", { name: "gravity" });
    expect(el.getAttribute("aria-checked")).toBe("true");
    expect(el.dataset.checked).toBe("true");
  });

  it("toggles on click", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="gravity" />);
    screen.getByRole("switch").click();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not fire when disabled", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="gravity" disabled />);
    screen.getByRole("switch").click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("drops a canceled drag without committing or eating the next tap", () => {
    // A scroll gesture stealing the pointer fires pointercancel. That must
    // not commit the half-drag, and must not arm the click swallow - the
    // canceled sequence never produces a click, so the flag would eat the
    // user's next real tap instead.
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="gravity" />);
    const el = screen.getByRole("switch");

    fireEvent.pointerDown(el, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 15, pointerId: 1 });
    fireEvent.pointerCancel(el, { pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();

    el.click();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("parks the thumb symmetrically at both ends", () => {
    // Regression: the old toggle used a 12.5px thumb in a 20px track with a
    // hardcoded 18px travel, so the "on" thumb stopped short of the edge.
    const off = render(<Switch checked={false} onChange={() => {}} label="gravity" />);
    const trackW = parseFloat(off.container.querySelector<HTMLElement>(".switch")!.style.width);
    const thumbW = parseFloat(thumb(off.container).style.width);
    expect(thumb(off.container).style.transform).toBe("translateX(0px)");

    cleanup();
    const on = render(<Switch checked onChange={() => {}} label="gravity" />);
    const travel = parseFloat(
      thumb(on.container).style.transform.replace(/[^0-9.-]/g, "")
    );
    const inset = parseFloat(getComputedStyle(thumb(on.container)).left || "2");
    // Same gap left of the off thumb as right of the on thumb.
    expect(travel + thumbW + inset).toBeCloseTo(trackW - inset, 5);
  });
});
