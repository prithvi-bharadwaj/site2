import { describe, expect, it } from "vitest";
import { createRibbonRenderer } from "@/lib/ink-ribbon-gl";

const GL_ONE = 1;
const GL_SRC_ALPHA = 0x0302;
const GL_ONE_MINUS_SRC_ALPHA = 0x0303;

interface Recorded {
  attrs: WebGLContextAttributes | undefined;
  blend: number[];
  shaders: string[];
  canvas: HTMLCanvasElement;
}

/**
 * Minimal WebGL stub. jsdom has no GL backend, and the alpha handling this
 * guards is invisible to a DOM screenshot, so record the calls instead.
 */
function stubGl(): Recorded {
  const record: Recorded = {
    attrs: undefined,
    blend: [],
    shaders: [],
    canvas: document.createElement("canvas"),
  };
  const gl = new Proxy(
    {
      ONE: GL_ONE,
      SRC_ALPHA: GL_SRC_ALPHA,
      ONE_MINUS_SRC_ALPHA: GL_ONE_MINUS_SRC_ALPHA,
      VERTEX_SHADER: 0x8b31,
      FRAGMENT_SHADER: 0x8b30,
      ARRAY_BUFFER: 0x8892,
      BLEND: 0x0be2,
      FLOAT: 0x1406,
      DYNAMIC_DRAW: 0x88e8,
      TRIANGLE_STRIP: 5,
      COLOR_BUFFER_BIT: 0x4000,
      LINK_STATUS: 0x8b82,
      createShader: () => ({}),
      shaderSource: (_s: unknown, source: string) => record.shaders.push(source),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: () => ({}),
      blendFunc: (...args: number[]) => record.blend.push(...args),
    } as Record<string, unknown>,
    { get: (target, key) => (key in target ? target[key as string] : () => undefined) },
  );
  record.canvas.getContext = ((type: string, attrs: WebGLContextAttributes) => {
    if (type !== "webgl") return null;
    record.attrs = attrs;
    return gl;
  }) as typeof record.canvas.getContext;
  return record;
}

describe("ink ribbon renderer", () => {
  it("composites premultiplied, so ink lands at the alpha it was asked for", () => {
    const record = stubGl();
    expect(createRibbonRenderer(record.canvas, [0.07, 0.07, 0.09])).not.toBeNull();

    // Straight-alpha output with a SRC_ALPHA blend costs a factor of alpha
    // twice: a 0.18 stroke renders at 0.03 and the effect vanishes.
    expect(record.attrs?.premultipliedAlpha).toBe(true);
    expect(record.blend).toEqual([GL_ONE, GL_ONE_MINUS_SRC_ALPHA]);

    const fragment = record.shaders.find((source) => source.includes("gl_FragColor"));
    expect(fragment).toBeDefined();
    expect(fragment).toMatch(/gl_FragColor\s*=\s*vec4\(\s*uColor\s*\*\s*a\s*,\s*a\s*\)/);
  });

  it("falls back to 2D when WebGL is unavailable", () => {
    const canvas = document.createElement("canvas");
    const ctx = { setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
    canvas.getContext = ((type: string) => (type === "2d" ? ctx : null)) as typeof canvas.getContext;
    const renderer = createRibbonRenderer(canvas, [0, 0, 0]);
    expect(renderer).not.toBeNull();
    renderer!.resize(252, 520, 2);
    // The bitmap and the CSS box must agree or everything drawn is stretched.
    expect([canvas.width, canvas.height]).toEqual([504, 1040]);
    expect([canvas.style.width, canvas.style.height]).toEqual(["252px", "520px"]);
  });
});
