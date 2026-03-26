---
title: Comet Trail Pointer Effect
date: 2026-03-26
status: complete
chosen_approach: Shader glow + Canvas 2D particle overlay
---

# Comet Trail Pointer Effect

## What We're Building
Replace the current reveal/ripple pointer modes with a bright comet trail effect. The cursor creates an intense glow that boosts ASCII character brightness and density, while a Canvas 2D particle overlay handles physical displacement of characters with spring-back physics.

## Why This Approach
- Shader handles glow/density cheaply (per-pixel, GPU)
- Canvas 2D particle overlay gives real per-character displacement + spring physics
- Two-layer compositing keeps each system simple and modular
- Configurable trail decay via lil-gui slider

## Key Decisions
- **Replace reveal + ripple**: Comet trail is the only pointer mode. Simplifies code.
- **Both brightness + density**: Characters near cursor get pushed toward white AND empty cells fill in.
- **Canvas 2D over WebGL particles**: True physics with spring-back, moderate complexity, no full rewrite needed.
- **Glow while displaced**: Characters brighten proportionally to displacement, fade as they spring home.
- **Configurable trail decay**: 0.1s – 3s slider in dev panel.

## Open Questions
None — all resolved during brainstorm.
