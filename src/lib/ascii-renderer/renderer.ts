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

  // Fullscreen quad
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPosition = gl.getAttribLocation(program, "aPosition");

  // Uniform locations
  const uniforms = {
    uVideo: gl.getUniformLocation(program, "uVideo"),
    uAtlas: gl.getUniformLocation(program, "uAtlas"),
    uResolution: gl.getUniformLocation(program, "uResolution"),
    uVideoSize: gl.getUniformLocation(program, "uVideoSize"),
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
    uPointer: gl.getUniformLocation(program, "uPointer"),
    uPointerRadius: gl.getUniformLocation(program, "uPointerRadius"),
    uPointerSoftness: gl.getUniformLocation(program, "uPointerSoftness"),
    uPointerOpacity: gl.getUniformLocation(program, "uPointerOpacity"),
    uInteractionMode: gl.getUniformLocation(program, "uInteractionMode"),
    uRippleFrequency: gl.getUniformLocation(program, "uRippleFrequency"),
    uRippleAmplitude: gl.getUniformLocation(program, "uRippleAmplitude"),
    uRippleSpeed: gl.getUniformLocation(program, "uRippleSpeed"),
    uTrailCount: gl.getUniformLocation(program, "uTrailCount"),
  };

  // Trail uniform locations (arrays)
  const uTrail: (WebGLUniformLocation | null)[] = [];
  const uTrailAlpha: (WebGLUniformLocation | null)[] = [];
  for (let i = 0; i < 16; i++) {
    uTrail.push(gl.getUniformLocation(program, `uTrail[${i}]`));
    uTrailAlpha.push(gl.getUniformLocation(program, `uTrailAlpha[${i}]`));
  }

  // Video texture (unit 0)
  const videoTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTex);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Config + glyph atlas
  let config: AsciiConfig = { ...DEFAULT_CONFIG, ...initialConfig };
  let atlas: GlyphAtlas = createGlyphAtlas(
    gl,
    getCharsForPreset(config),
    config.fontSize
  );

  // Pointer state
  let pointerState: PointerState = { x: 0.5, y: 0.5, opacity: 0, trail: [] };
  const pointerHandler = createPointerHandler(
    canvas,
    (state) => { pointerState = state; },
    {
      fadeSpeed: config.pointerFadeSpeed,
      trailLength: config.trailLength,
      trailDuration: config.trailDuration,
    }
  );

  // Video readiness
  let videoReady = false;
  let playing = false;
  let timeUpdated = false;

  const onPlaying = () => {
    playing = true;
    if (timeUpdated) videoReady = true;
  };
  const onTimeUpdate = () => {
    timeUpdated = true;
    if (playing) videoReady = true;
  };

  video.addEventListener("playing", onPlaying);
  video.addEventListener("timeupdate", onTimeUpdate);

  let animFrameId = 0;
  const startTime = performance.now();

  const BG_MODE_MAP: Record<string, number> = {
    blur: 0, solid: 1, original: 2, none: 3,
  };

  function render() {
    const elapsed = (performance.now() - startTime) / 1000;

    // Upload video frame
    if (videoReady) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTex);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video
      );
    }

    gl.useProgram(program);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.uniform1i(uniforms.uVideo, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
    gl.uniform1i(uniforms.uAtlas, 1);

    // Resolution + video size + cell size
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.uVideoSize, video.videoWidth || 1280, video.videoHeight || 720);
    gl.uniform2f(uniforms.uCellSize, atlas.charWidth, atlas.charHeight);
    gl.uniform1f(uniforms.uCharCount, atlas.charCount);

    // Character params
    gl.uniform1f(uniforms.uCharOpacity, config.charOpacity / 100);
    gl.uniform1f(uniforms.uInvert, config.invertMapping ? 1 : 0);

    // Intensity params
    gl.uniform1f(uniforms.uCoverage, config.coverage / 100);
    gl.uniform1f(uniforms.uDensity, config.density / 100);
    gl.uniform1f(uniforms.uBrightness, config.brightness / 100);
    gl.uniform1f(uniforms.uContrast, config.contrast / 100);
    gl.uniform1f(uniforms.uEdgeEmphasis, config.edgeEmphasis / 100);

    // Background params
    gl.uniform1f(uniforms.uBgMode, BG_MODE_MAP[config.bgMode] ?? 0);
    gl.uniform1f(uniforms.uBgBlur, config.bgBlur);
    gl.uniform1f(uniforms.uBgOpacity, config.bgOpacity / 100);

    // Animation params
    gl.uniform1f(uniforms.uTime, elapsed);
    gl.uniform1f(uniforms.uAnimated, config.animated ? 1 : 0);
    gl.uniform1f(uniforms.uAnimSpeed, config.animSpeed / 1000);
    gl.uniform1f(uniforms.uAnimIntensity, config.animIntensity / 100);
    gl.uniform1f(uniforms.uAnimRandomness, config.animRandomness / 100);

    // Pointer params
    gl.uniform2f(uniforms.uPointer, pointerState.x, pointerState.y);
    gl.uniform1f(uniforms.uPointerRadius, config.pointerRadius);
    gl.uniform1f(uniforms.uPointerSoftness, config.pointerSoftness);
    gl.uniform1f(uniforms.uPointerOpacity, pointerState.opacity);
    gl.uniform1f(uniforms.uInteractionMode, config.interactionMode);
    gl.uniform1f(uniforms.uRippleFrequency, config.rippleFrequency);
    gl.uniform1f(uniforms.uRippleAmplitude, config.rippleAmplitude);
    gl.uniform1f(uniforms.uRippleSpeed, config.rippleSpeed);

    // Trail data
    const trailCount = Math.min(pointerState.trail.length, 16);
    gl.uniform1i(uniforms.uTrailCount, trailCount);
    for (let i = 0; i < 16; i++) {
      if (i < trailCount) {
        const t = pointerState.trail[i];
        const alpha = 1.0 - t.age / config.trailDuration;
        gl.uniform2f(uTrail[i], t.x, t.y);
        gl.uniform1f(uTrailAlpha[i], Math.max(0, alpha));
      } else {
        gl.uniform2f(uTrail[i], 0, 0);
        gl.uniform1f(uTrailAlpha[i], 0);
      }
    }

    // Draw
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

  function getConfig() {
    return { ...config };
  }

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

  return { render, resize, updateConfig, getConfig, destroy };
}
