import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { PreviouslyList } from "@/components/PreviouslyList";

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

  it("expands proof inline on click instead of navigating", () => {
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

    // First click: expands the popup, doesn't navigate.
    const clickEvent = fireEvent.click(link);
    expect(clickEvent).toBe(false); // preventDefault was called
    const popupImg = container.querySelector('img[src="/screenshots/roam.png"]');
    expect(popupImg).not.toBeNull();

    // The popup media links to the site, same tab.
    const popupLink = popupImg!.closest("a")!;
    expect(popupLink.getAttribute("href")).toBe("https://roam.lol");
    expect(popupLink.getAttribute("target")).toBeNull();

    // Second click on the text collapses it again.
    fireEvent.click(link);
    expect(container.querySelector('img[src="/screenshots/roam.png"]')).toBeNull();
  });
});
