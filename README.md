# Piksel

A tiny, focused 32×32 pixel-loop toy built for an iPhone-sized viewport.

## What works

- Exact 32×32 logical canvas with integer CSS cell geometry
- Pencil, eraser, fill, eyedropper, four brush sizes, and a native color picker
- Frame selection, duplication, addition, and loop playback
- Separate Home and Editor surfaces
- Device-local saving, photo-to-pixel import, PNG sharing, and offline app shell
- Static build and GitHub Pages deployment workflow

## Run it

```sh
npm run dev
```

Then open `http://127.0.0.1:4173/`. The editor route is `/#/editor`.

## Verify it

```sh
npm test
npm run build
```
