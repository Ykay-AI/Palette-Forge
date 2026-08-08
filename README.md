# Palette Forge

An advanced, dependency-free color palette generator — built to sit in a portfolio, not just a codepen. Vanilla HTML/CSS/JS, no build step, no frameworks.

**[Live demo →](#)**https://color-palette.joytree.site/

## Why this is more than a swatch grid

The [original tutorial version](https://github.com/QuantumTan/colorPalleteGenerator) generates five random hex codes and lets you copy them. This build keeps that core interaction — press space, get a palette — and builds a real tool around it:

- **Color harmony engine** — five generation modes (Random, Analogous, Monochromatic, Complementary, Triadic) built on actual HSL color math, not just `Math.random()` on RGB channels.
- **Live UI preview** — the generated palette is applied to a real mock interface (nav bar, heading, buttons, card) in real time, so you can judge a palette by how it behaves on UI, not just as flat blocks.
- **Per-color inspector** — click any swatch to see its 10-step shade ramp (50–900, Tailwind-style) and WCAG contrast ratios against black/white with AA/AAA pass badges.
- **Named colors** — every hex is matched to the nearest of ~90 named colors (e.g. `#E2725B` → "Terracotta") using nearest-neighbor RGB distance.
- **Lock & regenerate** — lock any swatch (click the lock icon, or press `1`–`8`) and shuffle only the rest.
- **Drag to reorder** — swatches are draggable; drop one on another to swap its position.
- **Image → palette** — upload a photo and the app runs k-means clustering (with farthest-point seeding for well-separated clusters) over its pixels to extract dominant colors into unlocked swatches.
- **Shareable URLs** — the address bar always reflects the exact palette and mode on screen (`?colors=...&mode=...`); "Copy link" puts it on the clipboard, and opening a shared link reproduces the palette exactly.
- **Colorblindness simulation** — a dropdown previews the palette under protanopia, deuteranopia, tritanopia, or achromatopsia, applied as an SVG `feColorMatrix` filter over the display only — the underlying hex values (and anything you export or copy) are never altered.
- **Light / dark theme** — a toggle in the header switches the whole UI, preference remembered in `localStorage`.
- **Undo / redo** — full history stack, keyboard shortcuts included.
- **Code export** — copy the current palette as CSS custom properties, SCSS variables, a Tailwind config block, JSON, or a flat SVG strip.
- **Saved palettes** — persisted to `localStorage`, with thumbnails you can reload or delete.
- **Keyboard-first** — `Space` to shuffle, `1`–`8` to lock/unlock by position, `Z` / `Shift+Z` to undo/redo.
- Fully responsive, respects `prefers-reduced-motion`, visible focus states.

## How the color math works

- Colors are generated in HSL (hue/saturation/lightness) rather than raw RGB, because hue relationships (analogous, complementary, triadic) are what make a palette look intentional instead of random.
- Contrast checking implements the actual [WCAG relative luminance formula](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance), not an approximation — `(L1 + 0.05) / (L2 + 0.05)`.
- The shade ramp holds hue and saturation constant and walks lightness across 10 steps, the same approach design systems like Tailwind and Radix use to derive a color scale from a single brand color.
- Image extraction downsamples the photo to a max dimension of 120px, then runs k-means (k = current swatch count) over its RGB pixels. Centroids are seeded with farthest-point sampling rather than pure random picks, which reliably keeps distinct color regions from collapsing into one muddy cluster.
- Colorblindness simulation uses commonly-cited approximate transform matrices (the same family used by tools like Coblis) applied as an SVG `feColorMatrix` filter, so it's a display-only approximation, not a clinical simulation.

## Project structure

```
palette-forge/
├── index.html      # markup / structure
├── styles.css       # design system: tokens, layout, components
├── script.js        # color math, harmony generation, state, rendering
└── README.md
```

No `package.json`, no bundler — open `index.html` in a browser, or serve the folder with any static file server.

## Stack

Vanilla JavaScript (ES2017+), CSS custom properties, [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) / [Inter](https://fonts.google.com/specimen/Inter) / [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) via Google Fonts.

## Possible next steps

- Drag-and-drop the image file directly onto the palette strip, not just via the file picker
- A proper before/after split view for the colorblindness simulation
- Export the extracted-from-image palette back out as a downloadable PNG swatch card

## License

YK Makes
