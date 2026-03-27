export type RenderMode = "brightness" | "edge-map" | "dots";
export type CharPreset = "standard" | "detailed" | "minimal" | "blocks" | "binary" | "matrix" | "braille" | "dense" | "custom";
export type BlendMode = "source-over" | "overlay" | "color-dodge" | "screen" | "lighter";
export type BgMode = "blur" | "solid" | "original" | "none";
export type ColorBlend =
  | "multiply"
  | "overlay"
  | "screen"
  | "color"
  | "hue"
  | "saturation"
  | "luminosity"
  | "soft-light"
  | "hard-light"
  | "color-burn"
  | "color-dodge";
export type ParticleMode = "repel" | "attract";

/** Per-layer configuration — each layer renders independently */
export interface LayerConfig {
  // Characters
  renderMode: RenderMode;
  fontSize: number;
  charPreset: CharPreset;
  customChars: string;
  blendMode: BlendMode;
  charOpacity: number;
  invertMapping: boolean;
  dotGrid: boolean;

  // Intensity
  coverage: number;
  edgeEmphasis: number;
  density: number;
  brightness: number;
  contrast: number;

  // Animation
  animated: boolean;
  animSpeed: number;
  animIntensity: number;
  animRandomness: number;

  // Color overlay
  colorOverlay: string;
  colorOpacity: number;
  colorBlend: ColorBlend;
}

export interface AsciiConfig {
  layers: [LayerConfig, LayerConfig];

  // Video framing
  videoAnchorX: number;
  videoAnchorY: number;

  // Background
  bgMode: BgMode;
  bgBlur: number;
  bgOpacity: number;

  // Comet pointer
  cometRadius: number;
  cometGlow: number;
  cometTrailDecay: number;
  cometFadeSpeed: number;
  trailLength: number;

  // Particle displacement
  particleRepelForce: number;
  particleSpring: number;
  particleDamping: number;
  particleMode: ParticleMode;

  // Aurora overlay
  auroraEnabled: boolean;
  auroraIntensity: number;
  auroraSpeed: number;
  auroraGlowCount: number;
  auroraTwinkleCount: number;
  auroraGlowSize: number;
  auroraTwinkleSize: number;
  auroraColorShift: number;
  auroraCursorInfluence: number;
  auroraCursorRadius: number;
  auroraCurtainEnabled: boolean;
  auroraCurtainOpacity: number;
  auroraCurtainWaves: number;
  auroraCurtainSpeed: number;
  auroraLuminanceReactive: boolean;
  auroraLuminanceBias: number;
}

export const CHAR_PRESETS: Record<string, string> = {
  standard: "@#S08Xx+=-;:,. ",
  detailed: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^'. ",
  minimal: "@#*+=-:. ",
  blocks: "\u2588\u2593\u2592\u2591 ",
  binary: "01 ",
  matrix: "\uff7a\uff80\uff85\uff8a\uff90\uff95\uff9a0123456789 ",
  braille: "\u2840\u2844\u2846\u2847\u28c7\u28e7\u28f7\u28ff ",
  dense: "@%#*+=-:. ",
};

export function getCharsForPreset(layer: LayerConfig): string {
  if (layer.charPreset === "custom") return layer.customChars;
  return CHAR_PRESETS[layer.charPreset] ?? CHAR_PRESETS.standard;
}

const DARK_LAYER: LayerConfig = {
  renderMode: "brightness",
  fontSize: 14,
  charPreset: "dense",
  customChars: "@%#*+=-:. ",
  blendMode: "source-over",
  charOpacity: 100,
  invertMapping: true,
  dotGrid: false,

  coverage: 84.7,
  edgeEmphasis: 2,
  density: 0,
  brightness: 5.8,
  contrast: 21.2,

  animated: true,
  animSpeed: 900,
  animIntensity: 100,
  animRandomness: 100,

  colorOverlay: "#ffffff",
  colorOpacity: 100,
  colorBlend: "multiply",
};

const LIGHT_LAYER: LayerConfig = {
  renderMode: "brightness",
  fontSize: 14,
  charPreset: "minimal",
  customChars: "@#*+=-:. ",
  blendMode: "source-over",
  charOpacity: 40,
  invertMapping: false,
  dotGrid: false,

  coverage: 60,
  edgeEmphasis: 2,
  density: 0,
  brightness: 5.8,
  contrast: 21.2,

  animated: true,
  animSpeed: 1200,
  animIntensity: 60,
  animRandomness: 50,

  colorOverlay: "#ffffff",
  colorOpacity: 100,
  colorBlend: "multiply",
};

export const DESKTOP_CONFIG: AsciiConfig = {
  layers: [DARK_LAYER, LIGHT_LAYER],

  videoAnchorX: 0.5,
  videoAnchorY: 0,

  bgMode: "blur",
  bgBlur: 4.26,
  bgOpacity: 53,

  cometRadius: 0.25484,
  cometGlow: 0.295,
  cometTrailDecay: 1.8922,
  cometFadeSpeed: 2.2982,
  trailLength: 16,

  particleRepelForce: 181.97,
  particleSpring: 61.42,
  particleDamping: 0.85,
  particleMode: "repel",

  auroraEnabled: true,
  auroraIntensity: 60,
  auroraSpeed: 50,
  auroraGlowCount: 18,
  auroraTwinkleCount: 35,
  auroraGlowSize: 80,
  auroraTwinkleSize: 3,
  auroraColorShift: 40,
  auroraCursorInfluence: 40,
  auroraCursorRadius: 0.15,
  auroraCurtainEnabled: true,
  auroraCurtainOpacity: 4,
  auroraCurtainWaves: 3,
  auroraCurtainSpeed: 30,
  auroraLuminanceReactive: true,
  auroraLuminanceBias: 60,
};

export const MOBILE_CONFIG: AsciiConfig = {
  ...DESKTOP_CONFIG,
  layers: [
    { ...DARK_LAYER, fontSize: 10 },
    { ...LIGHT_LAYER, fontSize: 10 },
  ],
  videoAnchorX: 0.5,
  videoAnchorY: 0.5,
  cometRadius: 0.15,
};

export const DEFAULT_CONFIG = DESKTOP_CONFIG;
