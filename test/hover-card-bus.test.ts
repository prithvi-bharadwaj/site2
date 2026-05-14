import { describe, it, expect, vi, afterEach } from "vitest";
import {
  emitShow,
  emitMove,
  emitHide,
  onShow,
  onMove,
  onHide,
  type HoverCardMedia,
} from "@/lib/hover-card-bus";

const IMG: HoverCardMedia = { type: "image", src: "/x.jpg" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hover-card-bus", () => {
  it("dispatches and receives show with full detail", () => {
    const handler = vi.fn();
    const off = onShow(handler);
    emitShow({ media: IMG, x: 10, y: 20 });
    expect(handler).toHaveBeenCalledWith({ media: IMG, x: 10, y: 20 });
    off();
  });

  it("dispatches and receives move", () => {
    const handler = vi.fn();
    const off = onMove(handler);
    emitMove({ x: 50, y: 60 });
    expect(handler).toHaveBeenCalledWith({ x: 50, y: 60 });
    off();
  });

  it("dispatches and receives hide (no detail)", () => {
    const handler = vi.fn();
    const off = onHide(handler);
    emitHide();
    expect(handler).toHaveBeenCalledTimes(1);
    off();
  });

  it("off() removes the listener", () => {
    const handler = vi.fn();
    const off = onShow(handler);
    off();
    emitShow({ media: IMG, x: 0, y: 0 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("multiple listeners all fire", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onMove(a);
    const offB = onMove(b);
    emitMove({ x: 1, y: 2 });
    expect(a).toHaveBeenCalledWith({ x: 1, y: 2 });
    expect(b).toHaveBeenCalledWith({ x: 1, y: 2 });
    offA();
    offB();
  });
});
