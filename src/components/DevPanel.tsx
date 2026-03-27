"use client";

import { useEffect, useRef } from "react";
import { type AsciiConfig, type LayerConfig, CHAR_PRESETS } from "@/lib/ascii-renderer/config";
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
      const params = {
        ...config,
        layer0: { ...config.layers[0] },
        layer1: { ...config.layers[1] },
      };

      const update = () => {
        renderer.updateConfig({
          ...params,
          layers: [{ ...params.layer0 }, { ...params.layer1 }],
        });
      };

      function addLayerFolder(
        parent: InstanceType<typeof import("lil-gui").GUI>,
        name: string,
        layer: LayerConfig,
        onChange: () => void
      ) {
        const folder = parent.addFolder(name);

        // Characters
        const chars = folder.addFolder("Characters");
        chars.add(layer, "renderMode", ["brightness", "edge-map", "dots"]).onChange(onChange);
        chars.add(layer, "fontSize", 3, 48, 1).onChange(onChange);
        chars.add(layer, "charPreset", Object.keys(CHAR_PRESETS).concat("custom")).onChange((v: string) => {
          if (v !== "custom") layer.customChars = CHAR_PRESETS[v] ?? "";
          onChange();
        });
        chars.add(layer, "customChars").onChange(onChange);
        chars.add(layer, "charOpacity", 0, 100).onChange(onChange);
        chars.add(layer, "invertMapping").onChange(onChange);
        chars.add(layer, "dotGrid").onChange(onChange);

        // Intensity
        const intensity = folder.addFolder("Intensity");
        intensity.add(layer, "coverage", 0, 100).onChange(onChange);
        intensity.add(layer, "edgeEmphasis", 0, 100).onChange(onChange);
        intensity.add(layer, "density", 0, 100).onChange(onChange);
        intensity.add(layer, "brightness", -100, 100).onChange(onChange);
        intensity.add(layer, "contrast", -100, 100).onChange(onChange);

        // Animation
        const anim = folder.addFolder("Animation");
        anim.add(layer, "animated").onChange(onChange);
        anim.add(layer, "animSpeed", 100, 3000, 50).name("Speed (ms)").onChange(onChange);
        anim.add(layer, "animIntensity", 0, 100).name("Intensity").onChange(onChange);
        anim.add(layer, "animRandomness", 0, 100).name("Randomness").onChange(onChange);

        // Color Overlay
        const color = folder.addFolder("Color Overlay");
        color.addColor(layer, "colorOverlay").onChange(onChange);
        color.add(layer, "colorOpacity", 0, 100).onChange(onChange);
        color.add(layer, "colorBlend", [
          "multiply", "overlay", "screen", "color", "hue",
          "saturation", "luminosity", "soft-light", "hard-light",
          "color-burn", "color-dodge",
        ]).onChange(onChange);
      }

      // Layer folders
      addLayerFolder(gui, "Layer 0 (Dark)", params.layer0, update);
      addLayerFolder(gui, "Layer 1 (Light)", params.layer1, update);

      // Video Framing
      const framing = gui.addFolder("Video Framing");
      framing.add(params, "videoAnchorX", 0, 1).name("Anchor X").onChange(update);
      framing.add(params, "videoAnchorY", 0, 1).name("Anchor Y").onChange(update);

      // Background
      const bg = gui.addFolder("Background");
      bg.add(params, "bgMode", ["blur", "solid", "original", "none"]).onChange(update);
      bg.add(params, "bgBlur", 0, 60).onChange(update);
      bg.add(params, "bgOpacity", 0, 100).onChange(update);

      // Comet Pointer
      const comet = gui.addFolder("Comet Pointer");
      comet.add(params, "cometRadius", 0.02, 0.4).name("Radius").onChange(update);
      comet.add(params, "cometGlow", 0, 5).name("Glow Intensity").onChange(update);
      comet.add(params, "cometTrailDecay", 0.1, 3).name("Trail Decay (s)").onChange(update);
      comet.add(params, "cometFadeSpeed", 0.1, 3).name("Fade Speed (s)").onChange(update);
      comet.add(params, "trailLength", 1, 16, 1).name("Trail Points").onChange(update);

      // Particle Displacement
      const particles = gui.addFolder("Particle Displacement");
      particles.add(params, "particleRepelForce", 10, 300).name("Force").onChange(update);
      particles.add(params, "particleSpring", 20, 400).name("Spring Stiffness").onChange(update);
      particles.add(params, "particleDamping", 0.5, 0.99).name("Damping").onChange(update);
      particles.add(params, "particleMode", ["repel", "attract"]).name("Mode").onChange(update);

      // Copy Config
      gui.add({
        copyConfig: () => {
          const output = {
            ...params,
            layers: [{ ...params.layer0 }, { ...params.layer1 }],
          };
          const { layer0: _l0, layer1: _l1, ...rest } = output as Record<string, unknown>;
          navigator.clipboard.writeText(JSON.stringify(rest, null, 2));
        },
      }, "copyConfig").name("Copy Config");
    });

    return () => {
      if (gui) gui.destroy();
      guiRef.current = null;
    };
  }, [renderer]);

  return null;
}
