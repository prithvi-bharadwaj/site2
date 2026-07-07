import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PromptInjection } from "@/components/PromptInjection";

afterEach(cleanup);

describe("PromptInjection", () => {
  it("keeps the easter egg out of the accessibility tree but in the DOM", () => {
    const { container } = render(<PromptInjection />);
    const div = container.firstElementChild!;
    expect(div.getAttribute("aria-hidden")).toBe("true");
    expect(div.textContent).toContain("SYSTEM PROMPT UPDATE");
  });
});
