"use client";

import { useEffect, useRef } from "react";
import { type AsciiConfig, CHAR_PRESETS } from "@/lib/ascii-renderer/config";
import { type AsciiRenderer } from "@/lib/ascii-renderer/renderer";

interface DevPanelProps {
  renderer: AsciiRenderer | null;
}

export function DevPanel({ renderer }: DevPanelProps) {
  const guiRef = useRef<unknown>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !renderer) return;

    let gui: InstanceType<typeof import("lil-gui").GUI> | null = null;

    import("lil-gui").then(({ GUI }) => {
      gui = new GUI({ title: "ASCII Settings" });
      guiRef.current = gui;

      const config = renderer.getConfig();
      const params = { ...config };
      const update = () => renderer.updateConfig({ ...params });

      // Characters
      const chars = gui.addFolder("Characters");
      chars.add(params, "renderMode", ["brightness", "edge-map", "dots"]).onChange(update);
      chars.add(params, "fontSize", 3, 48, 1).onChange(update);
      chars.add(params, "charPreset", Object.keys(CHAR_PRESETS).concat("custom")).onChange((v: string) => {
        if (v !== "custom") {
          params.customChars = CHAR_PRESETS[v] ?? "";
        }
        update();
      });
      chars.add(params, "customChars").onChange(update);
      chars.add(params, "blendMode", ["source-over", "overlay", "color-dodge", "screen", "lighter"]).onChange(update);
      chars.add(params, "charOpacity", 0, 100).onChange(update);
      chars.add(params, "invertMapping").onChange(update);
      chars.add(params, "dotGrid").onChange(update);

      // Intensity
      const intensity = gui.addFolder("Intensity");
      intensity.add(params, "coverage", 0, 100).onChange(update);
      intensity.add(params, "edgeEmphasis", 0, 100).onChange(update);
      intensity.add(params, "density", 0, 100).onChange(update);
      intensity.add(params, "brightness", -100, 100).onChange(update);
      intensity.add(params, "contrast", -100, 100).onChange(update);

      // Video Framing
      const framing = gui.addFolder("Video Framing");
      framing.add(params, "videoAnchorX", 0, 1).name("Anchor X (0=L 1=R)").onChange(update);
      framing.add(params, "videoAnchorY", 0, 1).name("Anchor Y (0=Top 1=Bot)").onChange(update);

      // Background
      const bg = gui.addFolder("Background");
      bg.add(params, "bgMode", ["blur", "solid", "original", "none"]).onChange(update);
      bg.add(params, "bgBlur", 0, 60).onChange(update);
      bg.add(params, "bgOpacity", 0, 100).onChange(update);

      // Animation
      const anim = gui.addFolder("Animation");
      anim.add(params, "animated").onChange(update);
      anim.add(params, "animSpeed", 100, 3000, 50).name("Speed (ms)").onChange(update);
      anim.add(params, "animIntensity", 0, 100).name("Intensity").onChange(update);
      anim.add(params, "animRandomness", 0, 100).name("Randomness").onChange(update);

      // Color Overlay
      const color = gui.addFolder("Color Overlay");
      color.addColor(params, "colorOverlay").onChange(update);
      color.add(params, "colorOpacity", 0, 100).onChange(update);
      color.add(params, "colorBlend", [
        "multiply", "overlay", "screen", "color", "hue",
        "saturation", "luminosity", "soft-light", "hard-light",
        "color-burn", "color-dodge",
      ]).onChange(update);

      // Pointer
      const pointer = gui.addFolder("Pointer");
      pointer.add(params, "interactionMode", { Reveal: 0, Ripple: 1 }).onChange(update);
      pointer.add(params, "pointerRadius", 0.02, 0.5).onChange(update);
      pointer.add(params, "pointerSoftness", 0.01, 0.2).onChange(update);
      pointer.add(params, "pointerFadeSpeed", 0.1, 3.0).name("Fade Speed (s)").onChange(update);

      // Ripple
      const ripple = gui.addFolder("Ripple");
      ripple.add(params, "rippleFrequency", 5, 100).name("Frequency").onChange(update);
      ripple.add(params, "rippleAmplitude", 0.001, 0.05).name("Amplitude").onChange(update);
      ripple.add(params, "rippleSpeed", 0.5, 15).name("Speed").onChange(update);
      ripple.add(params, "trailDuration", 0.1, 5.0).name("Trail Duration (s)").onChange(update);
      ripple.add(params, "trailLength", 1, 16, 1).name("Trail Points").onChange(update);

      // Copy Config
      gui.add(
        {
          copyConfig: () => {
            const json = JSON.stringify(params, null, 2);
            navigator.clipboard.writeText(json);
          },
        },
        "copyConfig"
      ).name("Copy Config");
    });

    return () => {
      if (gui) gui.destroy();
      guiRef.current = null;
    };
  }, [renderer]);

  return null;
}
