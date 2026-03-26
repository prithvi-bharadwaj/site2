---
title: Personal Site with ASCII Video Effect
date: 2026-03-25
status: complete
chosen_approach: WebGL shader renderer with ascii-magic.com parameter controls
---

# Personal Site with ASCII Video Effect

## What We're Building

A personal website with a looping video background overlaid with a real-time, interactive ASCII art effect. The ASCII rendering uses a custom WebGL fragment shader (inspired by generalintuition.com's approach) with the full parameter set from ascii-magic.com. A bio, social links, and project links sit in the top-left corner. Built with Next.js (app router) for future expansion.

## Why This Approach

WebGL shader rendering (generalintuition.com style) gives the best performance for real-time video-to-ASCII conversion — the GPU handles per-frame texture sampling and glyph atlas lookup natively. Combined with the ascii-magic.com parameter set (coverage, edge emphasis, density, animation speed/randomness, etc.), this gives maximum visual control without sacrificing performance.

## Key Decisions

- **WebGL over Canvas 2D**: GPU-accelerated rendering handles video frames smoothly, especially on mobile. Pointer interaction (glow/reveal/ripple) lives naturally in shader uniforms.
- **ascii-magic.com parameter set**: Brightness render mode, minimal character preset, Sobel edge detection, animated shimmer — all configurable via uniforms.
- **lil-gui for dev panel**: Same tool generalintuition.com uses. Visible during development for real-time tweaking, hidden in production. Final values stored in a config file.
- **Next.js + App Router**: Single-page now but structured for expansion (blog, portfolio, experiments gallery).
- **Two mouse interaction modes**: Reveal/clear zone and distortion/ripple, toggleable.
- **Touch interaction on mobile**: Same effects adapted for tap/drag input.

## ASCII Effect Parameters (from ascii-magic.com settings)

### Characters
- Render Mode: Brightness
- Font Size: 17
- Preset: Minimal (`@#*+=-:. `)
- Blend Mode: Normal
- Char Opacity: 100%
- Invert Mapping: off
- Dot Grid Overlay: off

### Intensity
- Coverage: 73%
- Edge Emphasis: 85%
- Density: 30%
- Brightness: 0
- Contrast: 0

### Background
- Mode: Blurred Image
- Blur: 15px
- Opacity: 53%

### Animation
- Animated ASCII: on
- Speed: 0.9s
- Intensity: 99%
- Randomness: 100%

## Architecture Overview

```
src/
  app/                    # Next.js app router
    page.tsx              # Landing page
    layout.tsx            # Root layout
  components/
    AsciiCanvas.tsx       # WebGL canvas component
    BioOverlay.tsx        # Name, bio, links overlay
    DevPanel.tsx          # lil-gui wrapper (dev only)
  lib/
    ascii-renderer/
      renderer.ts         # WebGL setup, render loop
      shaders/
        vertex.glsl       # Vertex shader
        fragment.glsl     # Fragment shader (luminance → glyph atlas)
      glyph-atlas.ts      # Pre-render character atlas to texture
      pointer.ts          # Mouse/touch interaction handler
      config.ts           # Default ASCII parameters
  public/
    video/                # Background video file(s)
```

## Alternatives Considered

### A: Canvas 2D (ascii-magic.com approach)
- Pros: Simple, easy to debug, direct fillText rendering
- Cons: CPU-bound per frame, may struggle at high density on mobile
- Why not: WebGL is better for real-time video processing

### C: Three.js + AsciiEffect
- Pros: Nice abstractions, ecosystem
- Cons: Heavy dependency for a 2D effect, built-in AsciiEffect is limited
- Why not: Would need heavy customization to match the parameter set anyway

## Specifications

- **Tech stack**: Next.js + React, TypeScript, WebGL, lil-gui, GSAP (for text animations)
- **Video**: Short loop, < 30s, < 20MB, MP4
- **Hosting**: Custom domain (provider TBD)
- **Responsive**: Desktop + mobile, touch interaction on mobile
- **Content**: Name, short bio, social links (Twitter/X, GitHub, LinkedIn, etc.), game/project links

## Open Questions

None — all resolved during brainstorm.
