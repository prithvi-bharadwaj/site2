import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
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
});
