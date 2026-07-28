export type Rgb = [number, number, number];

/** Three colour stops the shader blends between, plus the seed that shaped them. */
export interface WindPalette {
  colors: [Rgb, Rgb, Rgb];
  seed: number;
}

export interface WindRenderer {
  resize(width: number, height: number, dpr: number): void;
  /** Render one frame at the given time (seconds). */
  draw(time: number): void;
  dispose(): void;
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor(hue / 60);
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];
  return [r + m, g + m, b + m];
}

/**
 * A fresh palette per page load: one random base hue, two analogous drifts.
 * Saturated but light, so the low-alpha wisps read as tinted air on white
 * and as a faint aurora on dark. `rand` is injectable for tests.
 */
export function randomWindPalette(rand: () => number = Math.random): WindPalette {
  const base = rand() * 360;
  return {
    colors: [
      hslToRgb(base, 0.85, 0.62),
      hslToRgb(base + 30 + rand() * 30, 0.8, 0.68),
      hslToRgb(base - 40 - rand() * 40, 0.75, 0.58),
    ],
    seed: rand() * 100,
  };
}

const VERTEX_SHADER = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Domain-warped fbm streaks rising from the bottom edge. Output is
// premultiplied (rgb * a, a) to match the context's premultipliedAlpha and
// the ONE / ONE_MINUS_SRC_ALPHA blend, same as ink-ribbon-gl.
const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 uSize;
uniform float uTime;
uniform float uSeed;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uIntensity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.7, 5.3);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = vec2(uv.x * uSize.x / uSize.y, uv.y);
  float t = uTime * 0.03;

  // Two fbm channels warp the third; the -t drift makes the wisps rise.
  vec2 q = vec2(
    fbm(p * vec2(1.6, 0.9) + vec2(uSeed, -t * 2.0)),
    fbm(p * vec2(1.6, 0.9) + vec2(uSeed + 7.3, -t * 1.4))
  );
  float f = fbm(p * vec2(2.6, 1.1) + q * 1.7 + vec2(uSeed * 2.0, -t * 3.0));

  // Strongest at the bottom edge, dissolved well before the top.
  float fall = pow(clamp(1.0 - uv.y, 0.0, 1.0), 2.6);
  float body = smoothstep(0.45, 1.15, f + fall * 0.55);

  vec3 col = mix(uColorA, uColorB, clamp(q.x * 1.5, 0.0, 1.0));
  col = mix(col, uColorC, clamp(q.y * q.y * 1.7, 0.0, 1.0) * 0.75);

  float a = body * fall * uIntensity;
  gl_FragColor = vec4(col * a, a);
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
 * Returns null when WebGL is unavailable - the mist is decoration, so the
 * caller falls back to a static CSS gradient rather than a 2D emulation.
 */
export function createWindRenderer(
  canvas: HTMLCanvasElement,
  palette: WindPalette,
  intensity: number,
): WindRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return null;
  const program = compileProgram(gl);
  const buffer = gl.createBuffer();
  if (!program || !buffer) return null;

  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uSize = gl.getUniformLocation(program, "uSize");
  const uTime = gl.getUniformLocation(program, "uTime");
  gl.uniform1f(gl.getUniformLocation(program, "uSeed"), palette.seed);
  gl.uniform3fv(gl.getUniformLocation(program, "uColorA"), palette.colors[0]);
  gl.uniform3fv(gl.getUniformLocation(program, "uColorB"), palette.colors[1]);
  gl.uniform3fv(gl.getUniformLocation(program, "uColorC"), palette.colors[2]);
  gl.uniform1f(gl.getUniformLocation(program, "uIntensity"), intensity);

  return {
    resize(width, height, dpr) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uSize, canvas.width, canvas.height);
    },
    draw(time) {
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
