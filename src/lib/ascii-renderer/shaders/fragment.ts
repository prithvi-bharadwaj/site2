export const fragmentShader = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uVideo;
uniform sampler2D uDisplacement; // R=dx, G=dy (128=zero), B=magnitude
uniform vec2 uResolution;
uniform vec2 uVideoSize;
uniform vec2 uVideoAnchor;
uniform vec2 uGridSize;         // cols, rows of the displacement grid
uniform float uDisplacementMax; // max displacement in pixels (must match JS)

uniform float uBgOpacity;
uniform float uBgBlur;
uniform float uBgMode;

uniform float uTime;

// Layer 0
uniform sampler2D uAtlas;
uniform vec2 uCellSize;
uniform float uCharCount;
uniform float uCharOpacity;
uniform float uCoverage;
uniform float uDensity;
uniform float uBrightness;
uniform float uContrast;
uniform float uInvert;
uniform float uEdgeEmphasis;
uniform float uAnimated;
uniform float uAnimSpeed;
uniform float uAnimIntensity;
uniform float uAnimRandomness;

// Layer 1
uniform sampler2D uAtlas1;
uniform vec2 uCellSize1;
uniform float uCharCount1;
uniform float uCharOpacity1;
uniform float uCoverage1;
uniform float uDensity1;
uniform float uBrightness1;
uniform float uContrast1;
uniform float uInvert1;
uniform float uEdgeEmphasis1;
uniform float uAnimated1;
uniform float uAnimSpeed1;
uniform float uAnimIntensity1;
uniform float uAnimRandomness1;

// Color overlay
uniform vec3 uColorOverlay0;
uniform float uColorOpacity0;
uniform float uColorBlendMode0;
uniform vec3 uColorOverlay1;
uniform float uColorOpacity1;
uniform float uColorBlendMode1;

// Comet pointer (kept for displacement)
uniform vec2 uCometPos;
uniform float uCometRadius;
uniform float uCometGlow;
uniform float uCometOpacity;

// Comet trail
uniform vec2 uCometTrail[16];
uniform float uCometTrailAlpha[16];
uniform int uCometTrailCount;

vec2 coverUV(vec2 uv, vec2 canvasSize, vec2 videoSize) {
  float canvasAspect = canvasSize.x / canvasSize.y;
  float videoAspect = videoSize.x / videoSize.y;
  vec2 scale = vec2(1.0);
  if (canvasAspect > videoAspect) {
    scale.y = videoAspect / canvasAspect;
  } else {
    scale.x = canvasAspect / videoAspect;
  }
  return uv * scale + uVideoAnchor * (1.0 - scale);
}

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float adjustBrightnessContrast(float lum, float brightness, float contrast) {
  float v = lum + brightness;
  if (contrast > 0.0) {
    v = (v - 0.5) * (1.0 + contrast * 3.0) + 0.5;
  } else {
    v = (v - 0.5) * (1.0 + contrast) + 0.5;
  }
  return clamp(v, 0.0, 1.0);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float sobelEdge(vec2 cellCenter, vec2 texelSize) {
  float tl = luminance(texture2D(uVideo, cellCenter + vec2(-texelSize.x,  texelSize.y)).rgb);
  float t  = luminance(texture2D(uVideo, cellCenter + vec2(        0.0,  texelSize.y)).rgb);
  float tr = luminance(texture2D(uVideo, cellCenter + vec2( texelSize.x,  texelSize.y)).rgb);
  float l  = luminance(texture2D(uVideo, cellCenter + vec2(-texelSize.x,         0.0)).rgb);
  float r  = luminance(texture2D(uVideo, cellCenter + vec2( texelSize.x,         0.0)).rgb);
  float bl = luminance(texture2D(uVideo, cellCenter + vec2(-texelSize.x, -texelSize.y)).rgb);
  float b  = luminance(texture2D(uVideo, cellCenter + vec2(        0.0, -texelSize.y)).rgb);
  float br = luminance(texture2D(uVideo, cellCenter + vec2( texelSize.x, -texelSize.y)).rgb);
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  return sqrt(gx * gx + gy * gy);
}

vec3 blurSample(vec2 uv, float radius) {
  vec2 texel = radius / uResolution;
  vec3 sum = texture2D(uVideo, uv).rgb;
  sum += texture2D(uVideo, uv + vec2( texel.x, 0.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(-texel.x, 0.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(0.0,  texel.y)).rgb;
  sum += texture2D(uVideo, uv + vec2(0.0, -texel.y)).rgb;
  sum += texture2D(uVideo, uv + vec2( texel.x,  texel.y)).rgb;
  sum += texture2D(uVideo, uv + vec2(-texel.x,  texel.y)).rgb;
  sum += texture2D(uVideo, uv + vec2( texel.x, -texel.y)).rgb;
  sum += texture2D(uVideo, uv + vec2(-texel.x, -texel.y)).rgb;
  sum += texture2D(uVideo, uv + vec2( texel.x * 2.0, 0.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(-texel.x * 2.0, 0.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(0.0,  texel.y * 2.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(0.0, -texel.y * 2.0)).rgb;
  return sum / 13.0;
}

vec3 applyColorBlend(vec3 base, vec3 overlay, float mode, float opacity) {
  vec3 result;
  if (mode < 0.5) {             // 0 = multiply
    result = base * overlay;
  } else if (mode < 1.5) {      // 1 = overlay
    result = vec3(
      base.r < 0.5 ? 2.0 * base.r * overlay.r : 1.0 - 2.0 * (1.0-base.r) * (1.0-overlay.r),
      base.g < 0.5 ? 2.0 * base.g * overlay.g : 1.0 - 2.0 * (1.0-base.g) * (1.0-overlay.g),
      base.b < 0.5 ? 2.0 * base.b * overlay.b : 1.0 - 2.0 * (1.0-base.b) * (1.0-overlay.b)
    );
  } else if (mode < 2.5) {      // 2 = screen
    result = 1.0 - (1.0 - base) * (1.0 - overlay);
  } else if (mode < 7.5) {      // 3-7: soft-light (covers color/hue/sat/lum + soft-light)
    result = vec3(
      overlay.r < 0.5 ? base.r - (1.0-2.0*overlay.r)*base.r*(1.0-base.r) : base.r + (2.0*overlay.r-1.0)*(sqrt(base.r)-base.r),
      overlay.g < 0.5 ? base.g - (1.0-2.0*overlay.g)*base.g*(1.0-base.g) : base.g + (2.0*overlay.g-1.0)*(sqrt(base.g)-base.g),
      overlay.b < 0.5 ? base.b - (1.0-2.0*overlay.b)*base.b*(1.0-base.b) : base.b + (2.0*overlay.b-1.0)*(sqrt(base.b)-base.b)
    );
  } else if (mode < 8.5) {      // 8 = hard-light
    result = vec3(
      overlay.r < 0.5 ? 2.0 * base.r * overlay.r : 1.0 - 2.0 * (1.0-base.r) * (1.0-overlay.r),
      overlay.g < 0.5 ? 2.0 * base.g * overlay.g : 1.0 - 2.0 * (1.0-base.g) * (1.0-overlay.g),
      overlay.b < 0.5 ? 2.0 * base.b * overlay.b : 1.0 - 2.0 * (1.0-base.b) * (1.0-overlay.b)
    );
  } else if (mode < 9.5) {      // 9 = color-burn
    result = vec3(
      overlay.r > 0.0 ? 1.0 - min(1.0, (1.0-base.r)/overlay.r) : 0.0,
      overlay.g > 0.0 ? 1.0 - min(1.0, (1.0-base.g)/overlay.g) : 0.0,
      overlay.b > 0.0 ? 1.0 - min(1.0, (1.0-base.b)/overlay.b) : 0.0
    );
  } else {                       // 10 = color-dodge
    result = vec3(
      overlay.r < 1.0 ? min(1.0, base.r/(1.0-overlay.r)) : 1.0,
      overlay.g < 1.0 ? min(1.0, base.g/(1.0-overlay.g)) : 1.0,
      overlay.b < 1.0 ? min(1.0, base.b/(1.0-overlay.b)) : 1.0
    );
  }
  return mix(base, result, opacity);
}

// Returns vec4(rgb color, alpha)
vec4 renderLayer(
  sampler2D atlas, vec2 cellSize, float charCount, float charOpacity,
  float coverage, float density, float brightness, float contrast,
  float invertMapping, float edgeEmphasis,
  float isAnimated, float animSpeed, float animIntensity, float animRandomness,
  vec3 colorOverlay, float colorOpacity, float colorBlendMode,
  vec2 pixelCoord, vec2 cell, vec2 disp, vec3 videoRgb, float rawLum
) {
  // Displaced pixel for UV within the glyph cell
  vec2 displacedPixel = pixelCoord + disp;
  vec2 cellUV = fract(displacedPixel / cellSize);

  // Brightness/contrast
  float lum = adjustBrightnessContrast(rawLum, brightness, contrast);

  // Edge emphasis
  vec2 cellCenter = (cell + 0.5) * cellSize / uResolution;
  vec2 cellCenterVideo = coverUV(cellCenter, uResolution, uVideoSize);
  vec2 texelSize = cellSize / uResolution;
  float edge = sobelEdge(cellCenterVideo, texelSize);
  lum = mix(lum, clamp(lum + edge * 2.0, 0.0, 1.0), edgeEmphasis);

  // Invert mapping
  float mappedLum = mix(lum, 1.0 - lum, invertMapping);

  // Coverage threshold
  float coverageThreshold = 1.0 - coverage;
  float densityBoost = mappedLum * (1.0 + density * 2.0);
  float finalLum = clamp(densityBoost, 0.0, 1.0);

  float showChar = step(coverageThreshold, finalLum);

  // Character index
  float charIndex = floor(finalLum * (charCount - 1.0));
  charIndex = clamp(charIndex, 0.0, charCount - 1.0);

  vec2 atlasUV = vec2(
    (charIndex + cellUV.x) / charCount,
    cellUV.y
  );
  float glyph = texture2D(atlas, atlasUV).r;
  glyph *= showChar;

  // Animation
  if (isAnimated > 0.5) {
    float cellHash = hash(cell);
    float wave = sin(uTime / animSpeed * 6.2831 + cellHash * 6.2831) * 0.5 + 0.5;
    float shimmer = mix(1.0, wave, animIntensity * 0.8);

    float swapChance = animRandomness * 0.15;
    float timeHash = hash(cell + vec2(floor(uTime / animSpeed * 3.0)));
    if (timeHash < swapChance && glyph > 0.01) {
      float newIndex = floor(hash(cell + vec2(uTime * 0.7)) * (charCount - 1.0));
      vec2 newAtlasUV = vec2((newIndex + cellUV.x) / charCount, cellUV.y);
      glyph = texture2D(atlas, newAtlasUV).r * showChar;
    }

    float flickerHash = hash(cell + vec2(floor(uTime * 8.0)));
    float flicker = step(animRandomness * 0.03, flickerHash);
    glyph *= shimmer * flicker;
  }

  // Color: start with video color, apply color overlay
  vec3 charColor = videoRgb;
  charColor = applyColorBlend(charColor, colorOverlay, colorBlendMode, colorOpacity);

  float alpha = glyph * charOpacity;
  return vec4(charColor, alpha);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 pixelCoord = vUV * uResolution;
  vec2 cell = floor(pixelCoord / uCellSize); // layer 0 cell grid for displacement

  // Displacement (shared)
  vec2 dispUV = (cell + 0.5) / uGridSize;
  vec4 dispSample = texture2D(uDisplacement, dispUV);
  vec2 disp = (dispSample.rg - 0.5) * 2.0 * uDisplacementMax;

  // Video sample at layer 0 cell center
  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec2 cellCenterVideo = coverUV(cellCenter, uResolution, uVideoSize);
  vec4 videoColor = texture2D(uVideo, cellCenterVideo);
  float rawLum = luminance(videoColor.rgb);

  // Layer 0
  vec4 layer0 = renderLayer(
    uAtlas, uCellSize, uCharCount, uCharOpacity,
    uCoverage, uDensity, uBrightness, uContrast,
    uInvert, uEdgeEmphasis,
    uAnimated, uAnimSpeed, uAnimIntensity, uAnimRandomness,
    uColorOverlay0, uColorOpacity0, uColorBlendMode0,
    pixelCoord, cell, disp, videoColor.rgb, rawLum
  );

  // Layer 1 — recalculate cell for potentially different cell size
  vec2 cell1 = floor(pixelCoord / uCellSize1);
  vec2 cellCenter1 = (cell1 + 0.5) * uCellSize1 / uResolution;
  vec2 cellCenterVideo1 = coverUV(cellCenter1, uResolution, uVideoSize);
  vec4 videoColor1 = texture2D(uVideo, cellCenterVideo1);
  float rawLum1 = luminance(videoColor1.rgb);

  vec4 layer1 = renderLayer(
    uAtlas1, uCellSize1, uCharCount1, uCharOpacity1,
    uCoverage1, uDensity1, uBrightness1, uContrast1,
    uInvert1, uEdgeEmphasis1,
    uAnimated1, uAnimSpeed1, uAnimIntensity1, uAnimRandomness1,
    uColorOverlay1, uColorOpacity1, uColorBlendMode1,
    pixelCoord, cell1, disp, videoColor1.rgb, rawLum1
  );

  // Background
  vec3 bgColor = vec3(0.0);
  float bgAlpha = 0.0;
  vec2 videoUV = coverUV(vUV, uResolution, uVideoSize);
  if (uBgMode < 0.5) {
    bgColor = blurSample(videoUV, uBgBlur);
    bgAlpha = uBgOpacity;
  } else if (uBgMode > 1.5 && uBgMode < 2.5) {
    bgColor = texture2D(uVideo, videoUV).rgb;
    bgAlpha = uBgOpacity;
  }

  // Composite: bg -> layer0 -> layer1
  vec3 finalColor = bgColor * bgAlpha;
  finalColor = mix(finalColor, layer0.rgb, layer0.a);
  finalColor = mix(finalColor, layer1.rgb, layer1.a);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;
