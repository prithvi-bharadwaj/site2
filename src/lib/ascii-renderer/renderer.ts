import { vertexShader as vertexSource } from "./shaders/vertex";
import { fragmentShader as fragmentSource } from "./shaders/fragment";
import { createGlyphAtlas, type GlyphAtlas } from "./glyph-atlas";
import { type AsciiConfig, DEFAULT_CONFIG, getCharsForPreset } from "./config";
import { createPointerHandler, type PointerState } from "./pointer";

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

export interface AsciiRenderer {
  render: () => void;
  resize: (width: number, height: number) => void;
  updateConfig: (config: AsciiConfig) => void;
  getConfig: () => AsciiConfig;
  getPointerState: () => PointerState;
  destroy: () => void;
}

export function createAsciiRenderer(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  initialConfig?: Partial<AsciiConfig>
): AsciiRenderer {
  const glOrNull = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!glOrNull) throw new Error("WebGL not supported");
  const gl: WebGLRenderingContext = glOrNull;

  const program = createProgram(gl, vertexSource, fragmentSource);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPosition = gl.getAttribLocation(program, "aPosition");

  const u = {
    uVideo: gl.getUniformLocation(program, "uVideo"),
    uAtlas: gl.getUniformLocation(program, "uAtlas"),
    uResolution: gl.getUniformLocation(program, "uResolution"),
    uVideoSize: gl.getUniformLocation(program, "uVideoSize"),
    uVideoAnchor: gl.getUniformLocation(program, "uVideoAnchor"),
    uCellSize: gl.getUniformLocation(program, "uCellSize"),
    uCharCount: gl.getUniformLocation(program, "uCharCount"),
    uCharOpacity: gl.getUniformLocation(program, "uCharOpacity"),
    uCoverage: gl.getUniformLocation(program, "uCoverage"),
    uDensity: gl.getUniformLocation(program, "uDensity"),
    uBrightness: gl.getUniformLocation(program, "uBrightness"),
    uContrast: gl.getUniformLocation(program, "uContrast"),
    uInvert: gl.getUniformLocation(program, "uInvert"),
    uEdgeEmphasis: gl.getUniformLocation(program, "uEdgeEmphasis"),
    uBgOpacity: gl.getUniformLocation(program, "uBgOpacity"),
    uBgBlur: gl.getUniformLocation(program, "uBgBlur"),
    uBgMode: gl.getUniformLocation(program, "uBgMode"),
    uTime: gl.getUniformLocation(program, "uTime"),
    uAnimated: gl.getUniformLocation(program, "uAnimated"),
    uAnimSpeed: gl.getUniformLocation(program, "uAnimSpeed"),
    uAnimIntensity: gl.getUniformLocation(program, "uAnimIntensity"),
    uAnimRandomness: gl.getUniformLocation(program, "uAnimRandomness"),
    uCometPos: gl.getUniformLocation(program, "uCometPos"),
    uCometRadius: gl.getUniformLocation(program, "uCometRadius"),
    uCometGlow: gl.getUniformLocation(program, "uCometGlow"),
    uCometDensityBoost: gl.getUniformLocation(program, "uCometDensityBoost"),
    uCometOpacity: gl.getUniformLocation(program, "uCometOpacity"),
    uCometTrailCount: gl.getUniformLocation(program, "uCometTrailCount"),
  };

  const uTrail: (WebGLUniformLocation | null)[] = [];
  const uTrailAlpha: (WebGLUniformLocation | null)[] = [];
  for (let i = 0; i < 16; i++) {
    uTrail.push(gl.getUniformLocation(program, `uCometTrail[${i}]`));
    uTrailAlpha.push(gl.getUniformLocation(program, `uCometTrailAlpha[${i}]`));
  }

  // Video texture
  const videoTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let config: AsciiConfig = { ...DEFAULT_CONFIG, ...initialConfig };
  let atlas: GlyphAtlas = createGlyphAtlas(gl, getCharsForPreset(config), config.fontSize);

  let pointerState: PointerState = { x: 0.5, y: 0.5, opacity: 0, trail: [] };
  const pointerHandler = createPointerHandler(
    canvas,
    (state) => { pointerState = state; },
    config.cometFadeSpeed,
    config.trailLength,
    config.cometTrailDecay
  );

  let videoReady = false;
  let playing = false;
  let timeUpdated = false;
  const onPlaying = () => { playing = true; if (timeUpdated) videoReady = true; };
  const onTimeUpdate = () => { timeUpdated = true; if (playing) videoReady = true; };
  video.addEventListener("playing", onPlaying);
  video.addEventListener("timeupdate", onTimeUpdate);

  let animFrameId = 0;
  const startTime = performance.now();
  const BG_MODE_MAP: Record<string, number> = { blur: 0, solid: 1, original: 2, none: 3 };

  function render() {
    const elapsed = (performance.now() - startTime) / 1000;

    if (videoReady) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }

    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.uniform1i(u.uVideo, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
    gl.uniform1i(u.uAtlas, 1);

    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    gl.uniform2f(u.uVideoSize, video.videoWidth || 1280, video.videoHeight || 720);
    gl.uniform2f(u.uVideoAnchor, config.videoAnchorX, config.videoAnchorY);
    gl.uniform2f(u.uCellSize, atlas.charWidth, atlas.charHeight);
    gl.uniform1f(u.uCharCount, atlas.charCount);
    gl.uniform1f(u.uCharOpacity, config.charOpacity / 100);
    gl.uniform1f(u.uInvert, config.invertMapping ? 1 : 0);
    gl.uniform1f(u.uCoverage, config.coverage / 100);
    gl.uniform1f(u.uDensity, config.density / 100);
    gl.uniform1f(u.uBrightness, config.brightness / 100);
    gl.uniform1f(u.uContrast, config.contrast / 100);
    gl.uniform1f(u.uEdgeEmphasis, config.edgeEmphasis / 100);
    gl.uniform1f(u.uBgMode, BG_MODE_MAP[config.bgMode] ?? 0);
    gl.uniform1f(u.uBgBlur, config.bgBlur);
    gl.uniform1f(u.uBgOpacity, config.bgOpacity / 100);
    gl.uniform1f(u.uTime, elapsed);
    gl.uniform1f(u.uAnimated, config.animated ? 1 : 0);
    gl.uniform1f(u.uAnimSpeed, config.animSpeed / 1000);
    gl.uniform1f(u.uAnimIntensity, config.animIntensity / 100);
    gl.uniform1f(u.uAnimRandomness, config.animRandomness / 100);

    // Comet
    gl.uniform2f(u.uCometPos, pointerState.x, pointerState.y);
    gl.uniform1f(u.uCometRadius, config.cometRadius);
    gl.uniform1f(u.uCometGlow, config.cometGlow);
    gl.uniform1f(u.uCometDensityBoost, config.cometDensityBoost);
    gl.uniform1f(u.uCometOpacity, pointerState.opacity);

    const trailCount = Math.min(pointerState.trail.length, 16);
    gl.uniform1i(u.uCometTrailCount, trailCount);
    for (let i = 0; i < 16; i++) {
      if (i < trailCount) {
        const t = pointerState.trail[i];
        gl.uniform2f(uTrail[i], t.x, t.y);
        gl.uniform1f(uTrailAlpha[i], Math.max(0, 1 - t.age / config.cometTrailDecay));
      } else {
        gl.uniform2f(uTrail[i], 0, 0);
        gl.uniform1f(uTrailAlpha[i], 0);
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animFrameId = requestAnimationFrame(render);
  }

  function resize(width: number, height: number) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  function updateConfig(newConfig: AsciiConfig) {
    const charsChanged =
      newConfig.charPreset !== config.charPreset ||
      newConfig.customChars !== config.customChars ||
      newConfig.fontSize !== config.fontSize;
    config = { ...newConfig };
    if (charsChanged) {
      gl.deleteTexture(atlas.texture);
      atlas = createGlyphAtlas(gl, getCharsForPreset(config), config.fontSize);
    }
  }

  function getConfig() { return { ...config }; }
  function getPointerState() { return { ...pointerState, trail: [...pointerState.trail] }; }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    pointerHandler.destroy();
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("timeupdate", onTimeUpdate);
    gl.deleteTexture(videoTex);
    gl.deleteTexture(atlas.texture);
    gl.deleteBuffer(posBuffer);
    gl.deleteProgram(program);
  }

  animFrameId = requestAnimationFrame(render);

  return { render, resize, updateConfig, getConfig, getPointerState, destroy };
}
