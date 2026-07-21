import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LinkList } from "@/components/LinkList";
import { onHide, onShow } from "@/lib/hover-card-bus";

afterEach(cleanup);

describe("LinkList", () => {
  it("expands supporting context when an item is clicked", () => {
    render(
      <LinkList
        items={[{ title: "First cheque from Google at 13", expand: "The backstory." }]}
      />
    );

    const detail = screen.getByText("The backstory.").closest(".work-detail");
    expect(detail).toHaveStyle({ maxHeight: "0" });

    fireEvent.click(screen.getByLabelText("First cheque from Google at 13"));
    expect(detail).toHaveStyle({ maxHeight: "240px" });
  });

  it("emits item-level proof media on mouse hover", () => {
    let shownSrc: string | undefined;
    const off = onShow(({ media }) => {
      if (media.type === "image") shownSrc = media.src;
    });

    render(
      <LinkList
        items={[
          {
            title: "First cheque from Google at 13",
            media: { type: "image", src: "/proof/youtube-password-video.png" },
          },
        ]}
      />
    );

    const item = screen.getByLabelText("First cheque from Google at 13").closest("div");
    fireEvent.pointerEnter(item!, { pointerType: "mouse", clientX: 40, clientY: 50 });

    expect(shownSrc).toBe("/proof/youtube-password-video.png");
    off();
  });

  it("hides proof media on expand and suppresses hover while expanded", () => {
    let shows = 0;
    let hides = 0;
    const offShow = onShow(() => { shows++; });
    const offHide = onHide(() => { hides++; });

    render(
      <LinkList
        items={[
          {
            title: "First cheque from Google at 13",
            expand: "The backstory.",
            media: { type: "image", src: "/proof/youtube-password-video.png" },
          },
        ]}
      />
    );

    const title = screen.getByLabelText("First cheque from Google at 13");
    const item = title.closest("div");

    fireEvent.pointerEnter(item!, { pointerType: "mouse", clientX: 40, clientY: 50 });
    expect(shows).toBe(1);

    // Expanding hides the card so it can't cover the revealed text…
    fireEvent.click(title);
    expect(hides).toBe(1);

    // …and hovering the expanded item doesn't bring it back.
    fireEvent.pointerEnter(item!, { pointerType: "mouse", clientX: 40, clientY: 50 });
    fireEvent.pointerMove(item!, { pointerType: "mouse", clientX: 42, clientY: 52 });
    expect(shows).toBe(1);

    // Collapsing restores hover proof.
    fireEvent.click(title);
    fireEvent.pointerEnter(item!, { pointerType: "mouse", clientX: 40, clientY: 50 });
    expect(shows).toBe(2);

    offShow();
    offHide();
  });

  it("marks underlined brand links for whole-unit wiggle", () => {
    render(
      <LinkList
        items={[
          {
            title: "CTO at roam — world models",
            brandLinks: [{ name: "roam", href: "https://roam.lol", favicon: "/logos/roam_favicon.png" }],
          },
        ]}
      />
    );

    const link = screen.getByRole("link", { name: /roam/i });
    expect(link.hasAttribute("data-repel")).toBe(true);
    expect(link.className).toContain("wl-unit");
  });
});
