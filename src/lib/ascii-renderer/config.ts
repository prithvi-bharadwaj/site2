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

export interface AsciiConfig {
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

  // Video framing
  videoAnchorX: number;
  videoAnchorY: number;

  // Background
  bgMode: BgMode;
  bgBlur: number;
  bgOpacity: number;

  // Animation
  animated: boolean;
  animSpeed: number;
  animIntensity: number;
  animRandomness: number;

  // Color overlay
  colorOverlay: string;
  colorOpacity: number;
  colorBlend: ColorBlend;

  // Comet pointer
  cometRadius: number;       // radius of glow effect (0-1 normalized)
  cometGlow: number;         // brightness boost intensity (0-5)
  cometDensityBoost: number; // how much to force coverage near cursor (0-1)
  cometTrailDecay: number;   // seconds for trail to fade (0.1-3)
  cometFadeSpeed: number;    // seconds for pointer to fade when idle
  trailLength: number;       // max trail points

  // Particle displacement
  particleRepelForce: number;
  particleSpring: number;
  particleDamping: number;

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

  // Entrance
  entranceDuration: number;   // seconds for decode animation (desktop: 2.5, mobile: 1.5)
  entranceEnabled: boolean;   // allow disabling for dev
  revealDelay: number;        // seconds after decode starts before bg reveal begins
  revealDuration: number;     // seconds for bg to fully reveal through random mask
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

export function getCharsForPreset(config: AsciiConfig): string {
  if (config.charPreset === "custom") return config.customChars;
  return CHAR_PRESETS[config.charPreset] ?? CHAR_PRESETS.standard;
}

export const DESKTOP_CONFIG: AsciiConfig = {
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

  videoAnchorX: 0.5,
  videoAnchorY: 0,

  bgMode: "blur",
  bgBlur: 4.26,
  bgOpacity: 53,

  animated: true,
  animSpeed: 900,
  animIntensity: 100,
  animRandomness: 100,

  colorOverlay: "#ffffff",
  colorOpacity: 100,
  colorBlend: "multiply",

  cometRadius: 0.25484,
  cometGlow: 0.295,
  cometDensityBoost: 0.338,
  cometTrailDecay: 1.8922,
  cometFadeSpeed: 2.2982,
  trailLength: 16,

  particleRepelForce: 181.97,
  particleSpring: 61.42,
  particleDamping: 0.85,

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

  entranceDuration: 2.5,
  entranceEnabled: true,
  revealDelay: 1.5,
  revealDuration: 2.0,
};

export const MOBILE_CONFIG: AsciiConfig = {
  ...DESKTOP_CONFIG,
  fontSize: 10,
  videoAnchorX: 0.5,
  videoAnchorY: 0.5,
  cometRadius: 0.15,
  coverage: 80,
  entranceDuration: 1.5,
  revealDelay: 1.0,
  revealDuration: 1.5,
};

export const DEFAULT_CONFIG = DESKTOP_CONFIG;
