import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { WiggleWords } from "@/components/WiggleWords";

afterEach(cleanup);

describe("WiggleWords", () => {
  it("renders the full text intact with per-word spans", () => {
    const { container } = render(<WiggleWords text="game studio at 19" />);

    // Visible text survives the per-word split, including spaces.
    expect(container.textContent).toBe("game studio at 19");

    // Each word gets its own wiggle span, hidden from screen readers in favor of aria-label.
    const words = container.querySelectorAll(".wl-word");
    expect(words.length).toBe(4);
    expect(container.querySelector("[aria-label='game studio at 19']")).not.toBeNull();
    words.forEach((w) => expect(w.getAttribute("aria-hidden")).toBe("true"));

    // Each non-space character gets a subtle-shear letter span inside its word.
    const letters = container.querySelectorAll(".wl-word .wl-ch");
    expect(letters.length).toBe("game studio at 19".replace(/\s/g, "").length);
  });
});
