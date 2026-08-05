import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { PreviouslyList } from "@/components/PreviouslyList";
import { onPin } from "@/lib/hover-card-bus";

afterEach(cleanup);

describe("PreviouslyList", () => {
  it("links only the first occurrence of a repeated phrase", () => {
    const { container } = render(
      <PreviouslyList
        label="Projects."
        items={[
          {
            title: "skills - my collection of AI skills i use daily",
            inlineLinks: [{ phrase: "skills", href: "https://github.com/prithvi-bharadwaj" }],
          },
        ]}
      />
    );

    const links = container.querySelectorAll("a");
    expect(links.length).toBe(1);
    expect(links[0].textContent).toBe("skills");
    expect(container.textContent).toContain("skills - my collection of AI skills i use daily");
  });

  it("renders without a section label, keeping the analytics name", () => {
    const { container } = render(
      <PreviouslyList items={[{ title: "Solo item" }]} analyticsLabel="previously" />
    );
    expect(container.textContent).toContain("Solo item");
    const root = container.querySelector("[data-analytics-section]");
    expect(root?.getAttribute("data-analytics-section")).toBe("previously");
  });

  it("pins the proof preview on click instead of navigating", () => {
    const pins: string[] = [];
    const off = onPin((d) => pins.push(d.href));
    const { container } = render(
      <PreviouslyList
        label="Previously."
        items={[
          {
            title: "CTO at roam",
            brandLinks: [
              {
                name: "roam",
                href: "https://roam.lol",
                favicon: "/logos/roam_favicon.png",
                media: { type: "image", src: "/screenshots/roam.png", caption: "roam.lol" },
              },
            ],
          },
        ]}
      />
    );

    const link = [...container.querySelectorAll("a")].find((a) => a.textContent?.includes("roam"))!;
    expect(link.getAttribute("target")).toBeNull(); // no new tabs anywhere

    // Mouse click (detail > 0): doesn't navigate, pins the hover card instead.
    const clickEvent = fireEvent.click(link, { detail: 1 });
    expect(clickEvent).toBe(false); // preventDefault was called
    expect(pins).toEqual(["https://roam.lol"]);

    // Keyboard activation (detail === 0): navigates, no pin.
    const keyboardEvent = fireEvent.click(link, { detail: 0 });
    expect(keyboardEvent).toBe(true); // no preventDefault - link follows href
    expect(pins).toEqual(["https://roam.lol"]);
    off();
  });

  it("pins a note confirm card for links without media instead of navigating", () => {
    const pins: { href: string; media: unknown }[] = [];
    const off = onPin((d) => pins.push({ href: d.href, media: d.media }));
    const { container } = render(
      <PreviouslyList
        label="In 2026 I built."
        items={[
          {
            title: "Focused - an open-source AI extension",
            inlineLinks: [{ phrase: "Focused", href: "https://github.com/prithvi-bharadwaj" }],
          },
        ]}
      />
    );

    const link = [...container.querySelectorAll("a")].find((a) => a.textContent === "Focused")!;

    // First click arms the confirm card; it must not navigate.
    const clickEvent = fireEvent.click(link, { detail: 1 });
    expect(clickEvent).toBe(false); // preventDefault was called
    expect(pins).toEqual([
      {
        href: "https://github.com/prithvi-bharadwaj",
        media: { type: "note", caption: "github.com/prithvi-bharadwaj" },
      },
    ]);

    // Keyboard activation still navigates directly (pinned card is mouse UI).
    const keyboardEvent = fireEvent.click(link, { detail: 0 });
    expect(keyboardEvent).toBe(true);
    expect(pins.length).toBe(1);
    off();
  });
});
