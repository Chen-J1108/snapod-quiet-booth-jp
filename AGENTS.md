# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable visual and localization decisions

- Keep the opening product render large (about half the viewport width) and tilted 45 degrees before the scroll transition begins.
- A fresh top-of-page load uses a Lightweight-inspired multi-phase intro: centered progress bar, full-screen product close-up, header/frame reveal, horizontal headline mask, then CTA reveal. Skip it for reduced-motion users and non-top hash targets.
- The loading phase is a full-black screen with a centered thin progress line and a live percentage driven by critical image, font, and video-metadata readiness; the product intro begins only after it reaches 100%.
- On desktop, the opening product begins below the CTA and may be heavily cropped by the bottom edge; mobile keeps the existing lower-half composition.
- The Focus chapter uses a strict split layout: product on the left, copy in a dedicated right column, with no silhouette/text overlap.
- Material callouts in the Layers chapter must sit outside the product silhouette rather than crossing over the render.
- The Layers chapter uses the CAD-derived `public/assets/models/snapod-assembly.glb` in the right-hand product zone. The source is the W1000 × D1000 × H2300 left-opening Solid Edge STEP assembly; keep the Japanese copy on the left and align callouts around the real-time model silhouette.
- The Layers model is scroll-scrubbed and calm: seven semantic assemblies separate from the assembled state, hold briefly, then regroup before the next chapter. It is rendered transparently with Three.js, uses an image fallback while loading or after WebGL failure, and reduced-motion users see a stable exploded state.
- During both chapter handoffs, the assembled booth and the regrouped exploded render must share one center, scale, and motion path so they read as a single object rather than two adjacent objects.
- Product renders used over colored or animated sections must have transparent backgrounds; do not reintroduce white studio backdrops.
- The scroll-story background uses a restrained animated audio waveform rather than the former orbit/grid graphic.
- The first wide placement card uses the project-local SNAPOD story video and should autoplay muted, loop, and remain inline on mobile.
- The exploded-view showcase appears after the specification strip and before installation scenes, using the project-local 5-second Seedance exploded-view video with muted inline looping, an accessible play/pause control, and a reduced-motion pause state.
- Customer-facing copy is Japanese-first and written for a Japanese ecommerce landing page: concise CTAs, natural business Japanese, localized units, and conditional notes for performance claims.
- Primary CTA buttons use a technical hover/focus treatment: the pill radius resolves into a fine rectangular outline, four crosshair corner marks appear just outside the border, and the whole control lifts only subtly.
- CAD conversion must use the versioned geometry-fingerprint manifest in `scripts/snapod-assembly.manifest.mjs`; positional `childIndexes` are not stable identifiers and must not return.
- The brand GLB carries the seekable `SNAPOD_INSTALL_V1` clip. Keep the door jamb static while the door leaf rotates around its declared Y-axis hinge, and preserve the documented installation sequence when changing the clip.
- Keep the internal CAD workbench as the separate `engineering:*` Vite entry. Never copy source STEP/IGES/BREP files or the OCCT/WASM engineering runtime into the public brand build.
- Do not show the numeric `00—100` progress readout in the lower-right corner of the scroll story; the left chapter rail remains the only visible progress navigation.
