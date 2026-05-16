# SAFELIGHT — image converter

A simple, fast, **100% in-browser** image converter. Convert between **PNG, JPEG and WebP** — accepts WebP, PNG, JPEG, GIF, BMP, AVIF and SVG as input. Nothing is uploaded; your images never leave your device.

## Features

- Drag & drop, browse, or paste images — batch convert as many as you want
- Output to PNG / JPEG / WebP with a live quality slider for lossy formats
- Per-file results: thumbnail, before→after size, and % saved
- Download files individually or all at once
- JPEG output flattens transparency onto white
- Single self-contained file — no build step, no server

## Use it

Open `index.html` in any modern browser.

## Deploy

It's a static site. To host it on Vercel:

```bash
npm i -g vercel
vercel
```

## Notes

Conversion uses the browser Canvas API, which can **encode** to PNG/JPEG/WebP only. AVIF, GIF and ICO output would require a server-side encoder.
