# SAFELIGHT — image converter

A simple, fast, **100% in-browser** image converter built with **Vite + React**. Convert between **PNG, JPEG and WebP** — accepts WebP, PNG, JPEG, GIF, BMP, AVIF and SVG as input. Nothing is uploaded; your images never leave your device.

## Features

- Drag & drop, browse, or paste images — batch convert as many as you want
- Output to PNG / JPEG / WebP with a live quality slider for lossy formats
- Per-file results: thumbnail, before→after size, and % saved
- Download files individually or all at once
- JPEG output flattens transparency onto white
- Fully client-side — conversion uses the browser Canvas API

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Deploy

Push to a Git repo and import on Vercel — the Vite preset is auto-detected. Or:

```bash
npm i -g vercel
vercel
```

## Notes

The browser Canvas API can **encode** to PNG/JPEG/WebP only. AVIF, GIF and ICO output would require a server-side encoder.
