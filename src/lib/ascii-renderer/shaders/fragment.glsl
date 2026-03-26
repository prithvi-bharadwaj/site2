precision mediump float;

varying vec2 vUV;

uniform sampler2D uVideo;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uCellSize;      // pixel dimensions of one ASCII cell
uniform float uCharCount;    // number of characters in atlas
uniform float uCharOpacity;  // 0.0 - 1.0
uniform float uCoverage;     // 0.0 - 1.0
uniform float uDensity;      // 0.0 - 1.0 (dark threshold)
uniform float uBrightness;   // -1.0 - 1.0
uniform float uContrast;     // -1.0 - 1.0
uniform float uInvert;       // 0.0 or 1.0
uniform float uBgOpacity;    // 0.0 - 1.0
uniform float uBgBlur;       // not used in shader (CSS handles blur)
uniform float uBgMode;       // 0=blur, 1=solid, 2=original, 3=none

// Edge detection
uniform float uEdgeEmphasis; // 0.0 - 1.0

// Animation
uniform float uTime;
uniform float uAnimated;     // 0.0 or 1.0
uniform float uAnimSpeed;    // seconds
uniform float uAnimIntensity;// 0.0 - 1.0
uniform float uAnimRandomness;// 0.0 - 1.0

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

// Simple pseudo-random from cell coordinates
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Sobel edge detection — samples 3x3 neighborhood
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

void main() {
  vec2 pixelCoord = vUV * uResolution;

  // Which cell are we in?
  vec2 cell = floor(pixelCoord / uCellSize);
  vec2 cellUV = fract(pixelCoord / uCellSize);

  // Sample video at cell center
  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec4 videoColor = texture2D(uVideo, cellCenter);
  float lum = luminance(videoColor.rgb);

  // Apply brightness/contrast
  lum = adjustBrightnessContrast(lum, uBrightness, uContrast);

  // Edge detection blend
  vec2 texelSize = uCellSize / uResolution;
  float edge = sobelEdge(cellCenter, texelSize);
  lum = mix(lum, clamp(lum + edge * 2.0, 0.0, 1.0), uEdgeEmphasis);

  // Invert mapping
  float mappedLum = mix(lum, 1.0 - lum, uInvert);

  // Coverage: cells below threshold become empty (space character)
  float coverageThreshold = 1.0 - uCoverage;
  float densityBoost = mappedLum * (1.0 + uDensity * 2.0);
  float finalLum = clamp(densityBoost, 0.0, 1.0);

  // Skip rendering for very dark cells (coverage control)
  float showChar = step(coverageThreshold, finalLum);

  // Map luminance to character index
  float charIndex = floor(finalLum * (uCharCount - 1.0));
  charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);

  // Look up glyph in atlas
  vec2 atlasUV = vec2(
    (charIndex + cellUV.x) / uCharCount,
    cellUV.y
  );
  float glyph = texture2D(uAtlas, atlasUV).r;
  glyph *= showChar;

  // Animation: shimmer effect
  if (uAnimated > 0.5) {
    float cellHash = hash(cell);
    float wave = sin(uTime / uAnimSpeed * 6.2831 + cellHash * 6.2831) * 0.5 + 0.5;
    float shimmer = mix(1.0, wave, uAnimIntensity * 0.3);

    // Random character swap
    float swapChance = uAnimRandomness * 0.05;
    float timeHash = hash(cell + vec2(floor(uTime / uAnimSpeed * 2.0)));
    if (timeHash < swapChance && glyph > 0.01) {
      float newIndex = floor(timeHash / swapChance * (uCharCount - 1.0));
      vec2 newAtlasUV = vec2((newIndex + cellUV.x) / uCharCount, cellUV.y);
      glyph = texture2D(uAtlas, newAtlasUV).r * showChar;
    }

    glyph *= shimmer;
  }

  // Background
  vec3 bgColor = vec3(0.0);
  float bgAlpha = 0.0;
  if (uBgMode < 0.5) {
    // Blurred image mode — we show the video with opacity as bg
    bgColor = texture2D(uVideo, vUV).rgb;
    bgAlpha = uBgOpacity;
  } else if (uBgMode > 1.5 && uBgMode < 2.5) {
    // Original image
    bgColor = texture2D(uVideo, vUV).rgb;
    bgAlpha = uBgOpacity;
  }
  // solid = black (default), none = transparent (bgAlpha stays 0)

  // Composite: background + ASCII characters
  vec3 charColor = videoColor.rgb;
  float alpha = glyph * uCharOpacity;

  vec3 finalColor = mix(bgColor * bgAlpha, charColor, alpha);

  gl_FragColor = vec4(finalColor, 1.0);
}
