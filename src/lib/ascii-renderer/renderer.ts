import { vertexShader as vertexSource } from "./shaders/vertex";
import { fragmentShader as fragmentSource } from "./shaders/fragment";
import { createGlyphAtlas, type GlyphAtlas } from "./glyph-atlas";
import { type AsciiConfig, type LayerConfig, DEFAULT_CONFIG, getCharsForPreset } from "./config";
import { createPointerHandler, type PointerState } from "./pointer";
import { DisplacementField, type DisplacementConfig } from "./displacement";

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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16 & 0xff) / 255, (n >> 8 & 0xff) / 255, (n & 0xff) / 255];
}

const COLOR_BLEND_MAP: Record<string, number> = {
  multiply: 0, overlay: 1, screen: 2, color: 3, hue: 4,
  saturation: 5, luminosity: 6, "soft-light": 7, "hard-light": 8,
  "color-burn": 9, "color-dodge": 10,
};

export interface AsciiRenderer {
  render: () => void;
  resize: (width: number, height: number) => void;
  updateConfig: (config: AsciiConfig) => void;
  getConfig: () => AsciiConfig;
  getPointerState: () => PointerState;
  sampleLuminance: () => Uint8Array | null;
  destroy: () => void;
}

const DISPLACEMENT_MAX = 60; // must match displacement.ts clamp

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
    // Shared
    uVideo: gl.getUniformLocation(program, "uVideo"),
    uAtlas: gl.getUniformLocation(program, "uAtlas"),
    uAtlas1: gl.getUniformLocation(program, "uAtlas1"),
    uDisplacement: gl.getUniformLocation(program, "uDisplacement"),
    uResolution: gl.getUniformLocation(program, "uResolution"),
    uVideoSize: gl.getUniformLocation(program, "uVideoSize"),
    uVideoAnchor: gl.getUniformLocation(program, "uVideoAnchor"),
    uGridSize: gl.getUniformLocation(program, "uGridSize"),
    uDisplacementMax: gl.getUniformLocation(program, "uDisplacementMax"),
    uTime: gl.getUniformLocation(program, "uTime"),

    // Background
    uBgOpacity: gl.getUniformLocation(program, "uBgOpacity"),
    uBgBlur: gl.getUniformLocation(program, "uBgBlur"),
    uBgMode: gl.getUniformLocation(program, "uBgMode"),

    // Layer 0
    uCellSize: gl.getUniformLocation(program, "uCellSize"),
    uCharCount: gl.getUniformLocation(program, "uCharCount"),
    uCharOpacity: gl.getUniformLocation(program, "uCharOpacity"),
    uCoverage: gl.getUniformLocation(program, "uCoverage"),
    uDensity: gl.getUniformLocation(program, "uDensity"),
    uBrightness: gl.getUniformLocation(program, "uBrightness"),
    uContrast: gl.getUniformLocation(program, "uContrast"),
    uInvert: gl.getUniformLocation(program, "uInvert"),
    uEdgeEmphasis: gl.getUniformLocation(program, "uEdgeEmphasis"),
    uAnimated: gl.getUniformLocation(program, "uAnimated"),
    uAnimSpeed: gl.getUniformLocation(program, "uAnimSpeed"),
    uAnimIntensity: gl.getUniformLocation(program, "uAnimIntensity"),
    uAnimRandomness: gl.getUniformLocation(program, "uAnimRandomness"),
    uColorOverlay0: gl.getUniformLocation(program, "uColorOverlay0"),
    uColorOpacity0: gl.getUniformLocation(program, "uColorOpacity0"),
    uColorBlendMode0: gl.getUniformLocation(program, "uColorBlendMode0"),

    // Layer 1
    uCellSize1: gl.getUniformLocation(program, "uCellSize1"),
    uCharCount1: gl.getUniformLocation(program, "uCharCount1"),
    uCharOpacity1: gl.getUniformLocation(program, "uCharOpacity1"),
    uCoverage1: gl.getUniformLocation(program, "uCoverage1"),
    uDensity1: gl.getUniformLocation(program, "uDensity1"),
    uBrightness1: gl.getUniformLocation(program, "uBrightness1"),
    uContrast1: gl.getUniformLocation(program, "uContrast1"),
    uInvert1: gl.getUniformLocation(program, "uInvert1"),
    uEdgeEmphasis1: gl.getUniformLocation(program, "uEdgeEmphasis1"),
    uAnimated1: gl.getUniformLocation(program, "uAnimated1"),
    uAnimSpeed1: gl.getUniformLocation(program, "uAnimSpeed1"),
    uAnimIntensity1: gl.getUniformLocation(program, "uAnimIntensity1"),
    uAnimRandomness1: gl.getUniformLocation(program, "uAnimRandomness1"),
    uColorOverlay1: gl.getUniformLocation(program, "uColorOverlay1"),
    uColorOpacity1: gl.getUniformLocation(program, "uColorOpacity1"),
    uColorBlendMode1: gl.getUniformLocation(program, "uColorBlendMode1"),

    // Comet
    uCometPos: gl.getUniformLocation(program, "uCometPos"),
    uCometRadius: gl.getUniformLocation(program, "uCometRadius"),
    uCometGlow: gl.getUniformLocation(program, "uCometGlow"),
    uCometOpacity: gl.getUniformLocation(program, "uCometOpacity"),
    uCometTrailCount: gl.getUniformLocation(program, "uCometTrailCount"),

    // Particle
    uParticleMode: gl.getUniformLocation(program, "uParticleMode"),
  };

  const uTrail: (WebGLUniformLocation | null)[] = [];
  const uTrailAlpha: (WebGLUniformLocation | null)[] = [];
  for (let i = 0; i < 16; i++) {
    uTrail.push(gl.getUniformLocation(program, `uCometTrail[${i}]`));
    uTrailAlpha.push(gl.getUniformLocation(program, `uCometTrailAlpha[${i}]`));
  }

  // Video texture (unit 0)
  const videoTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Displacement texture (unit 2)
  const dispTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, dispTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  let config: AsciiConfig = { ...DEFAULT_CONFIG, ...initialConfig } as AsciiConfig;

  // Two glyph atlases — one per layer
  let atlas0: GlyphAtlas = createGlyphAtlas(gl, getCharsForPreset(config.layers[0]), config.layers[0].fontSize);
  let atlas1: GlyphAtlas = createGlyphAtlas(gl, getCharsForPreset(config.layers[1]), config.layers[1].fontSize);

  // Displacement field (based on layer 0 cell size)
  const dispField = new DisplacementField();
  let dispInitialized = false;

  function initDisplacement() {
    if (canvas.width > 0 && atlas0.charWidth > 0) {
      dispField.init(canvas.width, canvas.height, atlas0.charWidth, atlas0.charHeight);
      dispInitialized = true;
    }
  }
  initDisplacement();

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
  let lastFrameTime = startTime;
  const BG_MODE_MAP: Record<string, number> = { blur: 0, solid: 1, original: 2, none: 3 };
  const PARTICLE_MODE_MAP: Record<string, number> = { repel: 0, attract: 1 };

  function render() {
    const now = performance.now();
    const elapsed = (now - startTime) / 1000;
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // --- Displacement physics ---
    if (dispInitialized) {
      const dispCfg: DisplacementConfig = {
        repelForce: config.particleRepelForce,
        repelRadius: config.cometRadius,
        spring: config.particleSpring,
        damping: config.particleDamping,
      };

      const mode = config.particleMode;

      // Repel/attract from current pointer
      if (pointerState.opacity > 0.05) {
        dispField.repel(pointerState.x, pointerState.y, dispCfg, mode);

        // Repel/attract from trail too
        for (const t of pointerState.trail) {
          const alpha = 1 - t.age / config.cometTrailDecay;
          if (alpha > 0.1) {
            dispField.repel(t.x, t.y, { ...dispCfg, repelForce: dispCfg.repelForce * alpha * 0.4 }, mode);
          }
        }
      }

      dispField.update(dt, dispCfg);

      // Upload displacement texture
      const texData = dispField.getTextureData();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, dispTex);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        dispField.textureCols, dispField.textureRows, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, texData
      );
    }

    // --- Upload video frame ---
    if (videoReady) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }

    gl.useProgram(program);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.uniform1i(u.uVideo, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlas0.texture);
    gl.uniform1i(u.uAtlas, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, dispTex);
    gl.uniform1i(u.uDisplacement, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, atlas1.texture);
    gl.uniform1i(u.uAtlas1, 3);

    // Shared uniforms
    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    gl.uniform2f(u.uVideoSize, video.videoWidth || 1280, video.videoHeight || 720);
    gl.uniform2f(u.uVideoAnchor, config.videoAnchorX, config.videoAnchorY);
    gl.uniform2f(u.uGridSize, dispField.textureCols || 1, dispField.textureRows || 1);
    gl.uniform1f(u.uDisplacementMax, DISPLACEMENT_MAX);
    gl.uniform1f(u.uTime, elapsed);

    // Background
    gl.uniform1f(u.uBgMode, BG_MODE_MAP[config.bgMode] ?? 0);
    gl.uniform1f(u.uBgBlur, config.bgBlur);
    gl.uniform1f(u.uBgOpacity, config.bgOpacity / 100);

    // Layer 0 uniforms
    const l0 = config.layers[0];
    gl.uniform2f(u.uCellSize, atlas0.charWidth, atlas0.charHeight);
    gl.uniform1f(u.uCharCount, atlas0.charCount);
    gl.uniform1f(u.uCharOpacity, l0.charOpacity / 100);
    gl.uniform1f(u.uInvert, l0.invertMapping ? 1 : 0);
    gl.uniform1f(u.uCoverage, l0.coverage / 100);
    gl.uniform1f(u.uDensity, l0.density / 100);
    gl.uniform1f(u.uBrightness, l0.brightness / 100);
    gl.uniform1f(u.uContrast, l0.contrast / 100);
    gl.uniform1f(u.uEdgeEmphasis, l0.edgeEmphasis / 100);
    gl.uniform1f(u.uAnimated, l0.animated ? 1 : 0);
    gl.uniform1f(u.uAnimSpeed, l0.animSpeed / 1000);
    gl.uniform1f(u.uAnimIntensity, l0.animIntensity / 100);
    gl.uniform1f(u.uAnimRandomness, l0.animRandomness / 100);

    // Layer 0 color overlay
    const color0 = hexToRgb(l0.colorOverlay);
    gl.uniform3f(u.uColorOverlay0, color0[0], color0[1], color0[2]);
    gl.uniform1f(u.uColorOpacity0, l0.colorOpacity / 100);
    gl.uniform1f(u.uColorBlendMode0, COLOR_BLEND_MAP[l0.colorBlend] ?? 0);

    // Layer 1 uniforms
    const l1 = config.layers[1];
    gl.uniform2f(u.uCellSize1, atlas1.charWidth, atlas1.charHeight);
    gl.uniform1f(u.uCharCount1, atlas1.charCount);
    gl.uniform1f(u.uCharOpacity1, l1.charOpacity / 100);
    gl.uniform1f(u.uInvert1, l1.invertMapping ? 1 : 0);
    gl.uniform1f(u.uCoverage1, l1.coverage / 100);
    gl.uniform1f(u.uDensity1, l1.density / 100);
    gl.uniform1f(u.uBrightness1, l1.brightness / 100);
    gl.uniform1f(u.uContrast1, l1.contrast / 100);
    gl.uniform1f(u.uEdgeEmphasis1, l1.edgeEmphasis / 100);
    gl.uniform1f(u.uAnimated1, l1.animated ? 1 : 0);
    gl.uniform1f(u.uAnimSpeed1, l1.animSpeed / 1000);
    gl.uniform1f(u.uAnimIntensity1, l1.animIntensity / 100);
    gl.uniform1f(u.uAnimRandomness1, l1.animRandomness / 100);

    // Layer 1 color overlay
    const color1 = hexToRgb(l1.colorOverlay);
    gl.uniform3f(u.uColorOverlay1, color1[0], color1[1], color1[2]);
    gl.uniform1f(u.uColorOpacity1, l1.colorOpacity / 100);
    gl.uniform1f(u.uColorBlendMode1, COLOR_BLEND_MAP[l1.colorBlend] ?? 0);

    // Particle mode
    gl.uniform1i(u.uParticleMode, PARTICLE_MODE_MAP[config.particleMode] ?? 0);

    // Comet
    gl.uniform2f(u.uCometPos, pointerState.x, pointerState.y);
    gl.uniform1f(u.uCometRadius, config.cometRadius);
    gl.uniform1f(u.uCometGlow, config.cometGlow);
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
    initDisplacement();
  }

  function layerCharsChanged(a: LayerConfig, b: LayerConfig): boolean {
    return a.charPreset !== b.charPreset ||
      a.customChars !== b.customChars ||
      a.fontSize !== b.fontSize;
  }

  function updateConfig(newConfig: AsciiConfig) {
    const layer0Changed = layerCharsChanged(newConfig.layers[0], config.layers[0]);
    const layer1Changed = layerCharsChanged(newConfig.layers[1], config.layers[1]);
    config = { ...newConfig };
    if (layer0Changed) {
      gl.deleteTexture(atlas0.texture);
      atlas0 = createGlyphAtlas(gl, getCharsForPreset(config.layers[0]), config.layers[0].fontSize);
      initDisplacement();
    }
    if (layer1Changed) {
      gl.deleteTexture(atlas1.texture);
      atlas1 = createGlyphAtlas(gl, getCharsForPreset(config.layers[1]), config.layers[1].fontSize);
    }
  }

  function getConfig() { return { ...config }; }
  function getPointerState() { return { ...pointerState, trail: [...pointerState.trail] }; }

  // Luminance sampling for aurora
  const LUMINANCE_SIZE = 32;
  const luminanceOut = new Uint8Array(LUMINANCE_SIZE * LUMINANCE_SIZE);
  let lastLuminanceSample = 0;

  function sampleLuminance(): Uint8Array | null {
    if (!videoReady) return null;
    const now = performance.now();
    if (now - lastLuminanceSample < 100) return luminanceOut;
    lastLuminanceSample = now;

    const cw = canvas.width;
    const ch = canvas.height;
    const fullBuf = new Uint8Array(cw * ch * 4);
    gl.readPixels(0, 0, cw, ch, gl.RGBA, gl.UNSIGNED_BYTE, fullBuf);

    const cellW = cw / LUMINANCE_SIZE;
    const cellH = ch / LUMINANCE_SIZE;
    for (let gy = 0; gy < LUMINANCE_SIZE; gy++) {
      for (let gx = 0; gx < LUMINANCE_SIZE; gx++) {
        const px = Math.floor((gx + 0.5) * cellW);
        const py = ch - 1 - Math.floor((gy + 0.5) * cellH);
        const idx = (py * cw + px) * 4;
        luminanceOut[gy * LUMINANCE_SIZE + gx] = Math.round(
          0.299 * (fullBuf[idx] ?? 0) + 0.587 * (fullBuf[idx + 1] ?? 0) + 0.114 * (fullBuf[idx + 2] ?? 0)
        );
      }
    }
    return luminanceOut;
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    pointerHandler.destroy();
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("timeupdate", onTimeUpdate);
    gl.deleteTexture(videoTex);
    gl.deleteTexture(atlas0.texture);
    gl.deleteTexture(atlas1.texture);
    gl.deleteTexture(dispTex);
    gl.deleteBuffer(posBuffer);
    gl.deleteProgram(program);
  }

  animFrameId = requestAnimationFrame(render);

  return { render, resize, updateConfig, getConfig, getPointerState, sampleLuminance, destroy };
}
