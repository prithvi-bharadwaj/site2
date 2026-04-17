import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProofMedia } from "@/components/ProofMedia";

afterEach(cleanup);

describe("ProofMedia", () => {
  it("renders an image by default with src, alt, and lazy loading", () => {
    render(<ProofMedia src="/proof/yt.jpg" w={320} h={180} alt="hello" />);
    const img = screen.getByAltText("hello") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "/proof/yt.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("renders a video element when kind is video", () => {
    const { container } = render(
      <ProofMedia kind="video" src="/proof/c.mp4" w={320} h={180} alt="clip" />
    );
    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video).toHaveAttribute("src", "/proof/c.mp4");
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
  });

  it("preserves aspect ratio from w and h", () => {
    const { container } = render(<ProofMedia src="/a.jpg" w={400} h={100} />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.style.aspectRatio).toBe("400 / 100");
    expect(img.style.maxWidth).toBe("400px");
  });
});
