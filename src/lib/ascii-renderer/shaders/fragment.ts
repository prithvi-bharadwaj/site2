export const fragmentShader = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uVideo;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uVideoSize;
uniform vec2 uVideoAnchor;
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

// Comet pointer
uniform vec2 uCometPos;
uniform float uCometRadius;
uniform float uCometGlow;
uniform float uCometDensityBoost;
uniform float uCometOpacity;  // fades when idle

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

// Compute comet glow intensity at a point from cursor + trail
float cometInfluence(vec2 uv, float aspect) {
  float influence = 0.0;

  // Main cursor
  if (uCometOpacity > 0.01) {
    vec2 d = vec2((uv.x - uCometPos.x) * aspect, uv.y - uCometPos.y);
    float dist = length(d);
    float glow = smoothstep(uCometRadius, 0.0, dist) * uCometOpacity;
    influence = max(influence, glow);
  }

  // Trail points — additive glow
  for (int i = 0; i < 16; i++) {
    if (i >= uCometTrailCount) break;
    float alpha = uCometTrailAlpha[i];
    if (alpha < 0.01) continue;
    vec2 d = vec2((uv.x - uCometTrail[i].x) * aspect, uv.y - uCometTrail[i].y);
    float dist = length(d);
    float glow = smoothstep(uCometRadius * 0.8, 0.0, dist) * alpha * 0.7;
    influence = max(influence, glow);
  }

  return clamp(influence, 0.0, 1.0);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 videoUV = coverUV(vUV, uResolution, uVideoSize);
  vec2 pixelCoord = vUV * uResolution;

  vec2 cell = floor(pixelCoord / uCellSize);
  vec2 cellUV = fract(pixelCoord / uCellSize);

  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec2 cellCenterVideo = coverUV(cellCenter, uResolution, uVideoSize);
  vec4 videoColor = texture2D(uVideo, cellCenterVideo);
  float lum = luminance(videoColor.rgb);

  lum = adjustBrightnessContrast(lum, uBrightness, uContrast);

  vec2 texelSize = uCellSize / uResolution;
  float edge = sobelEdge(cellCenterVideo, texelSize);
  lum = mix(lum, clamp(lum + edge * 2.0, 0.0, 1.0), uEdgeEmphasis);

  float mappedLum = mix(lum, 1.0 - lum, uInvert);

  // Comet influence on this cell
  float comet = cometInfluence(cellCenter, aspect);

  // Boost coverage near comet
  float effectiveCoverage = mix(uCoverage, 1.0, comet * uCometDensityBoost);
  float coverageThreshold = 1.0 - effectiveCoverage;
  float densityBoost = mappedLum * (1.0 + uDensity * 2.0);
  float finalLum = clamp(densityBoost, 0.0, 1.0);

  // Boost luminance near comet — push toward white
  finalLum = mix(finalLum, 1.0, comet * uCometGlow * 0.4);

  float showChar = step(coverageThreshold, finalLum);

  float charIndex = floor(finalLum * (uCharCount - 1.0));
  charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);

  vec2 atlasUV = vec2(
    (charIndex + cellUV.x) / uCharCount,
    cellUV.y
  );
  float glyph = texture2D(uAtlas, atlasUV).r;
  glyph *= showChar;

  // Animation
  if (uAnimated > 0.5) {
    float cellHash = hash(cell);
    float wave = sin(uTime / uAnimSpeed * 6.2831 + cellHash * 6.2831) * 0.5 + 0.5;
    float shimmer = mix(1.0, wave, uAnimIntensity * 0.8);

    float swapChance = uAnimRandomness * 0.15;
    float timeHash = hash(cell + vec2(floor(uTime / uAnimSpeed * 3.0)));
    if (timeHash < swapChance && glyph > 0.01) {
      float newIndex = floor(hash(cell + vec2(uTime * 0.7)) * (uCharCount - 1.0));
      vec2 newAtlasUV = vec2((newIndex + cellUV.x) / uCharCount, cellUV.y);
      glyph = texture2D(uAtlas, newAtlasUV).r * showChar;
    }

    float flickerHash = hash(cell + vec2(floor(uTime * 8.0)));
    float flicker = step(uAnimRandomness * 0.03, flickerHash);
    glyph *= shimmer * flicker;
  }

  // Background
  vec3 bgColor = vec3(0.0);
  float bgAlpha = 0.0;
  if (uBgMode < 0.5) {
    bgColor = blurSample(videoUV, uBgBlur);
    bgAlpha = uBgOpacity;
  } else if (uBgMode > 1.5 && uBgMode < 2.5) {
    bgColor = texture2D(uVideo, videoUV).rgb;
    bgAlpha = uBgOpacity;
  }

  // Composite
  vec3 charColor = videoColor.rgb;

  // Comet brightness boost on character color — push toward white
  charColor = mix(charColor, vec3(1.0), comet * uCometGlow * 0.6);

  float alpha = glyph * uCharOpacity;
  vec3 finalColor = mix(bgColor * bgAlpha, charColor, alpha);

  // Additive comet bloom — soft glow halo
  finalColor += vec3(comet * uCometGlow * 0.15);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;
