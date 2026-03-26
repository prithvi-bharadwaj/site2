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
  videoAnchorX: number; // 0=left, 0.5=center, 1=right
  videoAnchorY: number; // 0=top, 0.5=center, 1=bottom

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

  // Pointer
  pointerRadius: number;
  pointerSoftness: number;
  interactionMode: number; // 0 = reveal, 1 = ripple
  pointerFadeSpeed: number; // seconds to fade out
  rippleFrequency: number; // wave frequency
  rippleAmplitude: number; // wave strength
  rippleSpeed: number; // wave scroll speed
  trailDuration: number; // seconds trail points last
  trailLength: number; // max trail points
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

  pointerRadius: 0.06656,
  pointerSoftness: 0.04,
  interactionMode: 0,
  pointerFadeSpeed: 0.8,
  rippleFrequency: 40,
  rippleAmplitude: 0.012,
  rippleSpeed: 4,
  trailDuration: 1,
  trailLength: 16,
};

export const MOBILE_CONFIG: AsciiConfig = {
  ...DESKTOP_CONFIG,
  fontSize: 10,
  videoAnchorX: 0.5,
  videoAnchorY: 0.5,
  pointerRadius: 0.1,
  coverage: 80,
};

export const DEFAULT_CONFIG = DESKTOP_CONFIG;
