export interface StripPoint {
  x: number;
  y: number;
}

/** One polyline to render as an anti-aliased ribbon. */
export interface RenderStrip {
  points: StripPoint[];
  thickness: number;
  alpha: number;
}

export interface RibbonRenderer {
  resize(width: number, height: number, dpr: number): void;
  draw(strips: RenderStrip[]): void;
  dispose(): void;
}

const VERTEX_SHADER = `
attribute vec2 aPos;
attribute float aEdge;
uniform vec2 uSize;
varying float vEdge;
void main() {
  vEdge = aEdge;
  vec2 clip = (aPos / uSize) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uInner;
varying float vEdge;
void main() {
  float coverage = 1.0 - smoothstep(uInner, 1.0, abs(vEdge));
  gl_FragColor = vec4(uColor, uAlpha * coverage);
}
`;

/**
 * Bitmap and CSS box in one place. Letting a stylesheet declare the box while JS
 * declares the bitmap silently stretches everything drawn when the two drift.
 */
function sizeCanvas(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): void {
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function compileProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const make = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const vertex = make(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = make(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return program;
}

/**
 * Expand a polyline into a ribbon triangle strip. Each point emits two vertices
 * offset along the local normal, carrying a signed edge coordinate the fragment
 * shader anti-aliases against. Layout per vertex: [x, y, edge].
 *
 * Closed polylines (last point on top of the first) wrap their tangents, so the
 * seam mitres like every other joint instead of notching.
 */
function buildRibbon(points: StripPoint[], halfWidth: number): Float32Array {
  const count = points.length;
  const data = new Float32Array(count * 2 * 3);
  const closed =
    count > 2 &&
    Math.abs(points[0].x - points[count - 1].x) < 1e-6 &&
    Math.abs(points[0].y - points[count - 1].y) < 1e-6;
  for (let i = 0; i < count; i++) {
    const previous = points[i > 0 ? i - 1 : closed ? count - 2 : 0];
    const next = points[i < count - 1 ? i + 1 : closed ? 1 : count - 1];
    let tx = next.x - previous.x;
    let ty = next.y - previous.y;
    const tangentLength = Math.hypot(tx, ty) || 1;
    tx /= tangentLength;
    ty /= tangentLength;

    const nx = -ty * halfWidth;
    const ny = tx * halfWidth;
    const base = i * 6;
    data[base] = points[i].x + nx;
    data[base + 1] = points[i].y + ny;
    data[base + 2] = 1;
    data[base + 3] = points[i].x - nx;
    data[base + 4] = points[i].y - ny;
    data[base + 5] = -1;
  }
  return data;
}

function createWebGLRenderer(
  canvas: HTMLCanvasElement,
  color: [number, number, number],
): RibbonRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const program = compileProgram(gl);
  const buffer = gl.createBuffer();
  if (!program || !buffer) return null;

  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const aPos = gl.getAttribLocation(program, "aPos");
  const aEdge = gl.getAttribLocation(program, "aEdge");
  const uSize = gl.getUniformLocation(program, "uSize");
  const uColor = gl.getUniformLocation(program, "uColor");
  const uAlpha = gl.getUniformLocation(program, "uAlpha");
  const uInner = gl.getUniformLocation(program, "uInner");
  gl.uniform3fv(uColor, color);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const STRIDE = 3 * 4;
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(aEdge);
  gl.vertexAttribPointer(aEdge, 1, gl.FLOAT, false, STRIDE, 8);

  // Anti-alias ramp, in CSS px: one device pixel, so lines land as crisp as a
  // CSS border instead of a soft band.
  let feather = 0.5;

  return {
    resize(width, height, dpr) {
      sizeCanvas(canvas, width, height, dpr);
      feather = 0.5 / dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uSize, width, height);
    },
    draw(strips) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const strip of strips) {
        const halfWidth = strip.thickness / 2 + feather;
        gl.uniform1f(uAlpha, strip.alpha);
        gl.uniform1f(uInner, Math.max(strip.thickness / 2 - feather, 0) / halfWidth);
        const ribbon = buildRibbon(strip.points, halfWidth);
        gl.bufferData(gl.ARRAY_BUFFER, ribbon, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, ribbon.length / 3);
      }
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function create2DRenderer(
  canvas: HTMLCanvasElement,
  color: [number, number, number],
): RibbonRenderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rgb = color.map((channel) => Math.round(channel * 255)).join(" ");
  let deviceRatio = 1;
  return {
    resize(width, height, dpr) {
      deviceRatio = dpr;
      sizeCanvas(canvas, width, height, dpr);
    },
    draw(strips) {
      ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (const strip of strips) {
        ctx.strokeStyle = `rgb(${rgb} / ${strip.alpha})`;
        ctx.lineWidth = strip.thickness;
        ctx.beginPath();
        ctx.moveTo(strip.points[0].x, strip.points[0].y);
        for (let i = 1; i < strip.points.length; i++) ctx.lineTo(strip.points[i].x, strip.points[i].y);
        ctx.stroke();
      }
    },
    dispose() {},
  };
}

export function createRibbonRenderer(
  canvas: HTMLCanvasElement,
  color: [number, number, number],
): RibbonRenderer | null {
  return createWebGLRenderer(canvas, color) ?? create2DRenderer(canvas, color);
}
