import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CookieQuest } from "@/components/CookieQuest";

vi.mock("@/lib/pretext-layout", () => ({
  layoutHero: () => ({
    words: "ALLOWCOOKIES".split("").map((text, index) => ({
      text,
      x: index * 8,
      y: 0,
      width: 8,
      height: 16,
      block: { text, type: "label" },
      lineIndex: 0,
      key: `letter-${index}`,
    })),
  }),
}));

beforeEach(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("cookie popup", () => {
  it("only opens after the visitor clicks the cookies trigger", async () => {
    render(<CookieQuest />);

    const trigger = await screen.findByRole("button", { name: "cookies" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes when the backdrop is clicked, but not when the window is clicked", async () => {
    render(<CookieQuest />);
    fireEvent.click(await screen.findByRole("button", { name: "cookies" }));

    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();

    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.mouseDown(backdrop!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    render(<CookieQuest />);
    fireEvent.click(await screen.findByRole("button", { name: "cookies" }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
