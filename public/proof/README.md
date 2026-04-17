# Proof assets

Drop artifacts here (screenshots, thumbnails, short loops, gifs).

## Naming

Use the trigger id from `parseDialogue`, lowercased + hyphenated.
e.g. `[youtube channel]` → `/proof/youtube-channel.jpg`.

## Wiring

Add an entry in `PROOFS` (see `src/app/page.tsx`):

```ts
"youtube-channel": {
  src: "/proof/youtube-channel.jpg",
  w: 320,
  h: 180,
  alt: "short description",
  // kind: "video" for .mp4 / .webm
},
```

## Sizing

- Pick `w` and `h` to match the source asset's real dimensions.
- Component scales down on narrow viewports; preserves aspect ratio.
- Keep `w` <= ~400 to stay inside the text column.

## Recommended formats

- Screenshots: `.jpg` or `.webp`
- Short clips: `.mp4` (h.264), muted, loops automatically
- Animated: `.webp` or `.gif` — use `kind: "image"`
