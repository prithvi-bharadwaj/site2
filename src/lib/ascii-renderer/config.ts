export type RenderMode = "brightness" | "edge-map" | "dots";
export type CharPreset = "standard" | "detailed" | "minimal" | "blocks" | "custom";
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

  // Pointer (our addition)
  pointerRadius: number;
  pointerSoftness: number;
  interactionMode: number; // 0 = reveal, 1 = ripple
}

export const CHAR_PRESETS: Record<string, string> = {
  standard: "@#S08Xx+=-;:,. ",
  detailed: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^'. ",
  minimal: "@#*+=-:. ",
  blocks: "\u2588\u2593\u2592\u2591 ",
};

export function getCharsForPreset(config: AsciiConfig): string {
  if (config.charPreset === "custom") return config.customChars;
  return CHAR_PRESETS[config.charPreset] ?? CHAR_PRESETS.standard;
}

export const DEFAULT_CONFIG: AsciiConfig = {
  renderMode: "brightness",
  fontSize: 17,
  charPreset: "minimal",
  customChars: "@#S08Xx+=-;:,. ",
  blendMode: "source-over",
  charOpacity: 100,
  invertMapping: false,
  dotGrid: false,

  coverage: 73,
  edgeEmphasis: 85,
  density: 30,
  brightness: 0,
  contrast: 0,

  bgMode: "blur",
  bgBlur: 15,
  bgOpacity: 53,

  animated: true,
  animSpeed: 900,
  animIntensity: 99,
  animRandomness: 100,

  colorOverlay: "#ff0000",
  colorOpacity: 0,
  colorBlend: "multiply",

  pointerRadius: 0.12,
  pointerSoftness: 0.04,
  interactionMode: 0,
};
