export interface StripPoint {
  x: number;
  y: number;
}

/** One polyline to render as an anti-aliased ribbon. */
export interface RenderStrip {
  points: StripPoint[];
  thickness: number;
  alpha: number;
  /** Cloth-style crease shading + tip fade; leave false for flat border strokes. */
  shaded?: boolean;
}

export interface ClothRenderer {
  resize(width: number, height: number, dpr: number): void;
  draw(strips: RenderStrip[]): void;
  dispose(): void;
}

const VERTEX_SHADER = `
attribute vec2 aPos;
attribute float aEdge;
attribute float aShade;
uniform vec2 uSize;
varying float vEdge;
varying float vShade;
void main() {
  vEdge = aEdge;
  vShade = aShade;
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
varying float vShade;
void main() {
  float coverage = 1.0 - smoothstep(uInner, 1.0, abs(vEdge));
  gl_FragColor = vec4(uColor, uAlpha * vShade * coverage);
}
`;

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
 * Expand a polyline into a ribbon triangle strip. Each point emits two
 * vertices offset along the local normal, carrying a signed edge coordinate
 * for anti-aliasing and a fold-based shade so bends read as cloth creases.
 * Layout per vertex: [x, y, edge, shade].
 */
function buildRibbon(points: StripPoint[], halfWidth: number, shaded: boolean): Float32Array {
  const count = points.length;
  const data = new Float32Array(count * 2 * 4);
  for (let i = 0; i < count; i++) {
    const previous = points[Math.max(i - 1, 0)];
    const next = points[Math.min(i + 1, count - 1)];
    let tx = next.x - previous.x;
    let ty = next.y - previous.y;
    const tangentLength = Math.hypot(tx, ty) || 1;
    tx /= tangentLength;
    ty /= tangentLength;

    // Signed curvature via the cross product of adjacent segment directions.
    let fold = 0;
    if (shaded && i > 0 && i < count - 1) {
      const current = points[i];
      const ax = current.x - previous.x;
      const ay = current.y - previous.y;
      const bx = next.x - current.x;
      const by = next.y - current.y;
      const lengths = (Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1;
      fold = (ax * by - ay * bx) / lengths;
    }
    const tip = shaded ? i / (count - 1) : 0;
    const shade = Math.min(Math.max(1 + fold * 0.9, 0.6), 1.25) * (1 - tip * 0.22);

    const nx = -ty * halfWidth;
    const ny = tx * halfWidth;
    const base = i * 8;
    data[base] = points[i].x + nx;
    data[base + 1] = points[i].y + ny;
    data[base + 2] = 1;
    data[base + 3] = shade;
    data[base + 4] = points[i].x - nx;
    data[base + 5] = points[i].y - ny;
    data[base + 6] = -1;
    data[base + 7] = shade;
  }
  return data;
}

function createWebGLRenderer(
  canvas: HTMLCanvasElement,
  color: [number, number, number],
): ClothRenderer | null {
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
  const aShade = gl.getAttribLocation(program, "aShade");
  const uSize = gl.getUniformLocation(program, "uSize");
  const uColor = gl.getUniformLocation(program, "uColor");
  const uAlpha = gl.getUniformLocation(program, "uAlpha");
  const uInner = gl.getUniformLocation(program, "uInner");
  gl.uniform3fv(uColor, color);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const STRIDE = 4 * 4;
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(aEdge);
  gl.vertexAttribPointer(aEdge, 1, gl.FLOAT, false, STRIDE, 8);
  gl.enableVertexAttribArray(aShade);
  gl.vertexAttribPointer(aShade, 1, gl.FLOAT, false, STRIDE, 12);

  // Anti-alias ramp, in CSS px: one device pixel, so lines land as crisp as a
  // CSS border instead of a soft band.
  let feather = 0.5;

  return {
    resize(width, height, dpr) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
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
        const ribbon = buildRibbon(strip.points, halfWidth, strip.shaded === true);
        gl.bufferData(gl.ARRAY_BUFFER, ribbon, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, ribbon.length / 4);
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
): ClothRenderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rgb = color.map((channel) => Math.round(channel * 255)).join(" ");
  let deviceRatio = 1;
  return {
    resize(width, height, dpr) {
      deviceRatio = dpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
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

export function createClothRenderer(
  canvas: HTMLCanvasElement,
  color: [number, number, number],
): ClothRenderer | null {
  return createWebGLRenderer(canvas, color) ?? create2DRenderer(canvas, color);
}
