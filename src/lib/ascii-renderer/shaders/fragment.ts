export const fragmentShader = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uVideo;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uVideoSize;      // actual video dimensions
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

// Pointer
uniform vec2 uPointer;
uniform float uPointerRadius;
uniform float uPointerSoftness;
uniform float uPointerOpacity;   // 0-1, fades when idle
uniform float uInteractionMode;
uniform float uRippleFrequency;
uniform float uRippleAmplitude;
uniform float uRippleSpeed;

// Trail points (up to 16)
uniform vec2 uTrail[16];
uniform float uTrailAlpha[16];
uniform int uTrailCount;

// Aspect-correct "cover" UV mapping for video
// Fills the canvas completely, cropping the video as needed (never stretches)
vec2 coverUV(vec2 uv, vec2 canvasSize, vec2 videoSize) {
  float canvasAspect = canvasSize.x / canvasSize.y;
  float videoAspect = videoSize.x / videoSize.y;

  vec2 scale = vec2(1.0);
  if (canvasAspect > videoAspect) {
    // Canvas is wider than video — scale video width to fill, crop height
    scale.y = canvasAspect / videoAspect;
  } else {
    // Canvas is taller than video — scale video height to fill, crop width
    scale.x = videoAspect / canvasAspect;
  }

  return (uv - 0.5) * scale + 0.5;
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

// Box blur approximation — 9 samples in a circle
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
  // Extra ring for stronger blur
  sum += texture2D(uVideo, uv + vec2( texel.x * 2.0, 0.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(-texel.x * 2.0, 0.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(0.0,  texel.y * 2.0)).rgb;
  sum += texture2D(uVideo, uv + vec2(0.0, -texel.y * 2.0)).rgb;
  return sum / 13.0;
}

void main() {
  float aspect = uResolution.x / uResolution.y;

  // Cover-mapped UV for video sampling
  vec2 videoUV = coverUV(vUV, uResolution, uVideoSize);

  // Compute combined ripple distortion from pointer + trail
  vec2 rippleOffset = vec2(0.0);
  if (uPointerOpacity > 0.01 && uInteractionMode > 0.5) {
    // Main pointer ripple
    vec2 delta = vUV - uPointer;
    float dist = length(vec2(delta.x * aspect, delta.y));
    float wave = sin(dist * uRippleFrequency - uTime * uRippleSpeed) * uRippleAmplitude;
    float falloff = smoothstep(uPointerRadius * 1.5, 0.0, dist) * uPointerOpacity;
    rippleOffset += normalize(vec2(delta.x * aspect, delta.y) + 0.0001) * wave * falloff / vec2(aspect, 1.0);

    // Trail ripples
    for (int i = 0; i < 16; i++) {
      if (i >= uTrailCount) break;
      float trailAlpha = uTrailAlpha[i];
      if (trailAlpha < 0.01) continue;
      vec2 tDelta = vUV - uTrail[i];
      float tDist = length(vec2(tDelta.x * aspect, tDelta.y));
      float tWave = sin(tDist * uRippleFrequency - uTime * uRippleSpeed) * uRippleAmplitude * 0.5;
      float tFalloff = smoothstep(uPointerRadius * 1.2, 0.0, tDist) * trailAlpha;
      rippleOffset += normalize(vec2(tDelta.x * aspect, tDelta.y) + 0.0001) * tWave * tFalloff / vec2(aspect, 1.0);
    }
  }

  vec2 sampleUV = videoUV + rippleOffset;
  vec2 pixelCoord = (vUV + rippleOffset) * uResolution;

  vec2 cell = floor(pixelCoord / uCellSize);
  vec2 cellUV = fract(pixelCoord / uCellSize);

  vec2 cellCenter = (cell + 0.5) * uCellSize / uResolution;
  vec2 cellCenterVideo = coverUV(cellCenter, uResolution, uVideoSize) + rippleOffset;
  vec4 videoColor = texture2D(uVideo, cellCenterVideo);
  float lum = luminance(videoColor.rgb);

  lum = adjustBrightnessContrast(lum, uBrightness, uContrast);

  vec2 texelSize = uCellSize / uResolution;
  float edge = sobelEdge(cellCenterVideo, texelSize);
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

  // Animation — more impactful
  if (uAnimated > 0.5) {
    float cellHash = hash(cell);

    // Stronger wave modulation
    float wave = sin(uTime / uAnimSpeed * 6.2831 + cellHash * 6.2831) * 0.5 + 0.5;
    float shimmer = mix(1.0, wave, uAnimIntensity * 0.8);

    // More aggressive character swap
    float swapChance = uAnimRandomness * 0.15;
    float timeHash = hash(cell + vec2(floor(uTime / uAnimSpeed * 3.0)));
    if (timeHash < swapChance && glyph > 0.01) {
      float newIndex = floor(hash(cell + vec2(uTime * 0.7)) * (uCharCount - 1.0));
      vec2 newAtlasUV = vec2((newIndex + cellUV.x) / uCharCount, cellUV.y);
      glyph = texture2D(uAtlas, newAtlasUV).r * showChar;
    }

    // Flicker: random cells briefly go dark
    float flickerHash = hash(cell + vec2(floor(uTime * 8.0)));
    float flicker = step(uAnimRandomness * 0.03, flickerHash);

    glyph *= shimmer * flicker;
  }

  // Background
  vec3 bgColor = vec3(0.0);
  float bgAlpha = 0.0;
  if (uBgMode < 0.5) {
    // Blurred image mode — actual blur sampling
    bgColor = blurSample(sampleUV, uBgBlur);
    bgAlpha = uBgOpacity;
  } else if (uBgMode > 1.5 && uBgMode < 2.5) {
    bgColor = texture2D(uVideo, sampleUV).rgb;
    bgAlpha = uBgOpacity;
  }

  vec3 charColor = videoColor.rgb;
  float alpha = glyph * uCharOpacity;
  vec3 asciiResult = mix(bgColor * bgAlpha, charColor, alpha);

  // Pointer reveal mode
  if (uPointerOpacity > 0.01 && uInteractionMode < 0.5) {
    vec2 uvAspect = vec2(vUV.x * aspect, vUV.y);
    vec2 ptrAspect = vec2(uPointer.x * aspect, uPointer.y);
    float pointerDist = distance(uvAspect, ptrAspect);
    float reveal = 1.0 - smoothstep(uPointerRadius - uPointerSoftness, uPointerRadius, pointerDist);
    reveal *= uPointerOpacity;

    vec3 rawVideo = texture2D(uVideo, videoUV).rgb;
    asciiResult = mix(asciiResult, rawVideo, reveal);

    // Trail reveals
    for (int i = 0; i < 16; i++) {
      if (i >= uTrailCount) break;
      float trailAlpha = uTrailAlpha[i];
      if (trailAlpha < 0.01) continue;
      vec2 tAspect = vec2(uTrail[i].x * aspect, uTrail[i].y);
      float tDist = distance(uvAspect, tAspect);
      float tReveal = 1.0 - smoothstep(uPointerRadius * 0.6 - uPointerSoftness, uPointerRadius * 0.6, tDist);
      tReveal *= trailAlpha * 0.6;
      asciiResult = mix(asciiResult, rawVideo, tReveal);
    }
  }

  gl_FragColor = vec4(asciiResult, 1.0);
}
`;
