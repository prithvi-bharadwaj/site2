export const fragmentShader = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uVideo;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uCellSize;
uniform float uCharCount;
uniform float uCharOpacity;
uniform float uCoverage;
uniform float uDensity;
uniform float uBrightness;
uniform float uContrast;
uniform float uInvert;
uniform float uBgOpacity;
uniform float uBgBlur;
uniform float uBgMode;

uniform float uEdgeEmphasis;

uniform float uTime;
uniform float uAnimated;
uniform float uAnimSpeed;
uniform float uAnimIntensity;
uniform float uAnimRandomness;

// Pointer interaction
uniform vec2 uPointer;
uniform float uPointerRadius;
uniform float uPointerSoftness;
uniform float uPointerActive;
uniform float uInteractionMode; // 0 = reveal, 1 = ripple

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

void main() {
  // Aspect-correct pointer distance
  float aspect = uResolution.x / uResolution.y;
  vec2 uvAspect = vec2(vUV.x * aspect, vUV.y);
  vec2 pointerAspect = vec2(uPointer.x * aspect, uPointer.y);
  float pointerDist = distance(uvAspect, pointerAspect);

  // Ripple mode: distort UVs near pointer
  vec2 sampleUV = vUV;
  if (uPointerActive > 0.5 && uInteractionMode > 0.5) {
    vec2 delta = vUV - uPointer;
    float dist = length(vec2(delta.x * aspect, delta.y));
    float wave = sin(dist * 50.0 - uTime * 4.0) * 0.008;
    float falloff = smoothstep(uPointerRadius * 1.5, 0.0, dist);
    sampleUV = vUV + normalize(vec2(delta.x * aspect, delta.y)) * wave * falloff / vec2(aspect, 1.0);
  }

  vec2 pixelCoord = sampleUV * uResolution;

  vec2 cell = floor(pixelCoord / uCellSize);
  vec2 cellUV = fract(pixelCoord / uCellSize);

  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec4 videoColor = texture2D(uVideo, cellCenter);
  float lum = luminance(videoColor.rgb);

  lum = adjustBrightnessContrast(lum, uBrightness, uContrast);

  vec2 texelSize = uCellSize / uResolution;
  float edge = sobelEdge(cellCenter, texelSize);
  lum = mix(lum, clamp(lum + edge * 2.0, 0.0, 1.0), uEdgeEmphasis);

  float mappedLum = mix(lum, 1.0 - lum, uInvert);

  float coverageThreshold = 1.0 - uCoverage;
  float densityBoost = mappedLum * (1.0 + uDensity * 2.0);
  float finalLum = clamp(densityBoost, 0.0, 1.0);

  float showChar = step(coverageThreshold, finalLum);

  float charIndex = floor(finalLum * (uCharCount - 1.0));
  charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);

  vec2 atlasUV = vec2(
    (charIndex + cellUV.x) / uCharCount,
    cellUV.y
  );
  float glyph = texture2D(uAtlas, atlasUV).r;
  glyph *= showChar;

  if (uAnimated > 0.5) {
    float cellHash = hash(cell);
    float wave = sin(uTime / uAnimSpeed * 6.2831 + cellHash * 6.2831) * 0.5 + 0.5;
    float shimmer = mix(1.0, wave, uAnimIntensity * 0.3);

    float swapChance = uAnimRandomness * 0.05;
    float timeHash = hash(cell + vec2(floor(uTime / uAnimSpeed * 2.0)));
    if (timeHash < swapChance && glyph > 0.01) {
      float newIndex = floor(timeHash / swapChance * (uCharCount - 1.0));
      vec2 newAtlasUV = vec2((newIndex + cellUV.x) / uCharCount, cellUV.y);
      glyph = texture2D(uAtlas, newAtlasUV).r * showChar;
    }

    glyph *= shimmer;
  }

  vec3 bgColor = vec3(0.0);
  float bgAlpha = 0.0;
  if (uBgMode < 0.5) {
    bgColor = texture2D(uVideo, sampleUV).rgb;
    bgAlpha = uBgOpacity;
  } else if (uBgMode > 1.5 && uBgMode < 2.5) {
    bgColor = texture2D(uVideo, sampleUV).rgb;
    bgAlpha = uBgOpacity;
  }

  vec3 charColor = videoColor.rgb;
  float alpha = glyph * uCharOpacity;
  vec3 asciiResult = mix(bgColor * bgAlpha, charColor, alpha);

  // Pointer reveal mode: show raw video inside pointer radius
  if (uPointerActive > 0.5 && uInteractionMode < 0.5) {
    float reveal = 1.0 - smoothstep(uPointerRadius - uPointerSoftness, uPointerRadius, pointerDist);
    vec3 rawVideo = texture2D(uVideo, vUV).rgb;
    asciiResult = mix(asciiResult, rawVideo, reveal);
  }

  gl_FragColor = vec4(asciiResult, 1.0);
}
`;
