import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Home from "@/app/page";

describe("homepage server render", () => {
  it("emits content in initial HTML (no hydration gate)", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Previously:");
    expect(html).toContain("Writing.");
    expect(html).toContain("Find me on.");
  });
});
