import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Accordion } from "@/components/Accordion";

afterEach(cleanup);

describe("Accordion", () => {
  it("starts collapsed and expands on click", () => {
    const { container } = render(
      <Accordion label="Lore.">
        <p>hidden content</p>
      </Accordion>
    );
    const button = screen.getByRole("button", { name: "Lore." });
    const panel = container.querySelector("div.grid") as HTMLDivElement;
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("inert");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("inert");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("inert");
  });

  it("respects defaultOpen", () => {
    render(
      <Accordion label="Side projects." defaultOpen>
        <p>content</p>
      </Accordion>
    );
    expect(screen.getByRole("button", { name: "Side projects." })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
});
