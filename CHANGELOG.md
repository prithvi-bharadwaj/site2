# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1.1] - 2026-03-28

### Fixed
- Stabilize physicsConfig object references in ParticleImage and ParticleText with useMemo (prevents rAF leak on re-render)
- Match error and 404 page background color to site (#0a0a0a instead of #000)

## [0.1.1.0] - 2026-03-28

### Added
- Particle text engine with bezier curve morphing, spring physics, and mouse repulsion
- ParticleText component — morphs between words ("developer", "creator", "explorer")
- ParticleImage component — renders SVG logos/icons as interactive particle clouds
- ProjectGrid with modal detail view, keyboard dismiss, and conditional links
- Content pages: about, projects, writing with GSAP stagger animations
- PageShell layout component with back navigation and animated entrance
- Error boundary and 404 page with minimal styling
- SEO metadata, JSON-LD structured data, Open Graph tags
- Vercel deployment config with asset caching headers
- Vitest + Testing Library test framework with 26 tests
- Noise texture overlay and custom easing curves
- Reduced motion support across all animated components
- Mobile-optimized particle counts (50% reduction on small screens)

### Changed
- Complete redesign from WebGL ASCII video renderer to minimal particle-based layout
- Background color from `#000` to `#0a0a0a`
- Font to Red Hat Display via Google Fonts
- Navigation from overlay to inline centered links with animated underlines

### Removed
- WebGL ASCII renderer, GLSL shaders, glyph atlas, displacement system
- Aurora overlay and particle overlay effects
- Video backgrounds (bg-desktop.mp4, bg-mobile.mp4)
- DevPanel development tool
- next.config.ts (using defaults)
- CI workflow (OAuth scope limitation)
