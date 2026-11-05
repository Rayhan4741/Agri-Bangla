# public/images

Drop your own licensed agricultural photographs here (WebP or AVIF, ≤ 200 KB each recommended).

The current design uses procedural 3D scenes, SVG illustrations and gradients so the site works
without any photo files. Good places to add photos later:

- `hero-fallback.webp` — a wide (≈2400×1350) Bangladeshi paddy landscape. To use it, replace the
  `<HeroFallback />` SVG in `src/components/hero/Hero.tsx` with an `<img loading="eager">`.
- `crops/<crop-id>.webp` — square crop photos (e.g. `crops/aman-rice.webp`) for `CropCard`.

Only use photos you have the rights to. Always add Bangla `alt` text.
