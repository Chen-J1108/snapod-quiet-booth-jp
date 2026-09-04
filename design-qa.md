# SNAPOD / Lightweight visual QA

Status: **PASSED**

Reference: `https://lightweight.info/en`

Scope: visual and interaction matching for the public SNAPOD brand page. Lightweight brand assets, copy, fonts, and product media were deliberately not copied; the comparison covers composition, spacing, section rhythm, sticky-scroll behavior, tone changes, and navigation states.

## Matched comparison set

| State | Reference | SNAPOD implementation | Result |
| --- | --- | --- | --- |
| Desktop hero | `qa/lightweight/source-desktop-hero.png` (1425 × 891) | `qa/snapod/implementation-desktop-hero-final.png` (1424 × 891) | Pass |
| Desktop exploded stage | `qa/lightweight/source-desktop-07-y4900.png` | `qa/snapod/implementation-desktop-structure-final.png` | Pass |
| Mobile hero | `qa/lightweight/source-mobile-hero.png` (375 × 812) | `qa/snapod/implementation-mobile-hero-final.png` (375 × 812) | Pass |
| Mobile menu | `qa/lightweight/source-mobile-menu.png` (375 × 812) | `qa/snapod/implementation-mobile-menu-final.png` (375 × 812) | Pass |
| Mobile search | `qa/lightweight/source-mobile-search.png` (375 × 812) | `qa/snapod/implementation-mobile-search-final.png` (375 × 812) | Pass |

Side-by-side review inputs:

- `qa/snapod/compare-desktop-hero.png`
- `qa/snapod/compare-desktop-structure.png`
- `qa/snapod/compare-mobile-hero.png`
- `qa/snapod/compare-mobile-menu.png`

## Visual checks

- Header height, three-column desktop navigation, italic wordmark treatment, pill search control, fine borders, and corner registration marks align with the reference anatomy.
- The opening scene uses a black full-screen loader with one centered 2 px progress line, followed by staged header, frame, product, headline, and CTA reveals.
- The main narrative is one continuous sticky scene: 500vh on desktop and 750svh on mobile.
- Product scale and crop follow the reference rhythm: oversized/cropped opening, left-side performance composition, centered close-up craft scene, right-side exploded construction scene, and left-side final product presentation.
- The header switches between dark and pale surfaces in sync with the story and later dark sections.
- Mobile menu and expanded search match the reference dimensions and hierarchy without covering the whole product scene.
- Editorial sections match the reference order and density: wide product film, three-card image grid, full-height dark media statement, split image/contact form, and large black footer.
- No P0 or P1 overflow, clipping, contrast, spacing, or responsive layout defects remain in the compared states.

## Interaction checks

- Desktop and mobile navigation anchors work.
- Chapter rail buttons scroll to their corresponding story states.
- Mobile menu opens/closes and exposes all primary links.
- Search expands, accepts input, filters realistic page destinations, and closes with the header or inline close control.
- Product film pauses and resumes; the accessible label updates with playback state.
- Contact form accepts a valid email and returns an inline success state without an external write.
- Browser console contains no application errors; only Vite/React development information messages were present.

## Intentional differences

- SNAPOD identity, Japanese copy, local scene photography/video, and the real SNAPOD GLB replace all Lightweight branding and wheel imagery.
- The exploded scene follows SNAPOD's real installation assemblies and hinge animation, so component silhouettes and separation distances reflect the booth rather than the reference wheel.
- Local SNAPOD fonts are used instead of copying the reference site's proprietary font files.

## Build checks

- `npm.cmd run build`: passed.
- `npm.cmd run test:sites`: passed (4/4 tests).

## Browser annotation revision — 2026-08-12

Source truth: the user annotation on `section#product > div.story-sticky`, requesting product-accurate color on the exploded assembly and softer story handoffs.

- Replaced the generic blue/white CAD appearance at runtime with a semantic SNAPOD finish map: sage exterior skins, charcoal structural/hardware parts, graphite textile/floor assemblies, and neutral translucent glass.
- Kept the material mapping tied to stable `moduleId` / `partId` metadata; no positional mesh-index dependency was introduced.
- Removed simultaneous raster/model overlap that produced a ghosted double booth. The implementation now uses staggered opacity windows, a lighter 2 px maximum transition defocus, and an earlier model zoom-out before the structure chapter.
- Widened chapter-copy, technical-field, background-tone, and final-product transition windows while retaining deterministic scroll-scrubbing.
- Desktop QA states: `qa/snapod/annotation-transition-entry-final.png`, `qa/snapod/annotation-exploded-color-final.png`, and `qa/snapod/annotation-product-final.png`.
- Mobile QA states: `qa/snapod/annotation-mobile-exploded-final.png` and `qa/snapod/annotation-mobile-product-final.png`.
- Checked desktop and 375 × 812 mobile layouts. No new overlap, clipping, double-model ghosting, or application console errors remained.

final result: passed

## Layers model inward-position revision — 2026-09-04

### Comparison target and evidence

- Source visual truth: `C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-7e189093-4ba4-4a17-9d89-cbdd2fddd47a.png` — user-annotated `02 / 多層構造` desktop frame, 1920 × 929 px.
- Implementation desktop capture: `.tmp/qa-layers-after-source-state.png` — 1905 × 938 px capture at a 1920 × 945 CSS viewport, device scale factor 1, story progress `0.405`.
- Implementation mobile capture: `.tmp/qa-layers-mobile.png` — 375 × 812 px capture at a 390 × 844 CSS viewport, device scale factor 1, story progress `0.450`.
- Full-view comparison input: `.tmp/qa-layers-comparison.png` — source and implementation uniformly normalized to 1920 × 945 px and placed side by side. The desktop state is matched to the source's early separation phase; the red source annotation is treated only as the requested movement region.
- A separate focused crop was unnecessary because the only changed surface is the full product/copy composition, which is legible in the full-view comparison.

### Findings and comparison history

- [P2 fixed] The desktop booth trajectory hugged the right frame and made the composition feel unbalanced.
  Evidence: the source annotation encloses the product near the right edge; the pre-fix implementation kept the model container on the right-edge anchor throughout the entry and settled phases.
  Fix: shifted the complete desktop exploded-model path 6vw inward while preserving the existing scale, vertical position, separation timing, and regroup motion.
  Post-fix evidence: at progress `0.405` the product reads clearly inside the right product zone with a substantially larger outer margin, while the left copy retains its dedicated safe area. At progress `0.450` the fully separated model follows the same center without a lateral jump.

### Required fidelity surfaces

- Fonts and typography: unchanged; the Japanese eyebrow, headline, and explanatory copy retain the same font, weight, line height, and wrapping.
- Spacing and layout rhythm: the product moved inward by 6vw on desktop only; size and vertical rhythm remain unchanged, and no readable copy is crossed by the visible model silhouette.
- Colors and visual tokens: unchanged; the pale scene, ink values, technical guides, and callout opacity remain intact.
- Image quality and asset fidelity: unchanged real-time CAD-derived GLB and material mapping; no raster scaling, background, or compression was introduced.
- Copy and content: unchanged; chapter labels, callouts, rail, and product text remain complete.
- Responsive result: the 390 × 844 mobile capture retains the prior centered model (`--exploded-x: 0vw`) with no horizontal overflow or copy collision.

### Open questions and follow-up polish

- None for this scoped adjustment. A further inward move would begin reducing the intentional separation between the left copy zone and the product silhouette at compact desktop widths.

final result: passed

## Information deck continuation QA — 2026-08-24

### Comparison target and evidence

- Source visual truth: `C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-68c9407d-f7cf-4fbb-813b-a9e45f784b18.png` — user-selected information-page composition, 1258 × 636 px.
- Secondary source visual truth: `public/assets/scenes/quiet-work-statement-v1.webp` — approved static statement scene, 1672 × 941 px.
- Desktop implementation viewport: 970 × 654 CSS px at device scale factor 1 in the in-app browser.
- Implementation captures: `qa/snapod/implementation-deck-overview-final.png` and `qa/snapod/implementation-statement-header-final.png`, each 961 × 648 px browser content capture.
- Full-view comparison: `qa/snapod/compare-deck-overview-final.png`. The source was uniformly normalized to 961 × 486 px; the implementation comparison uses its post-header content region (x 0–961, y 80–566) to avoid treating fixed browser/header chrome as a layout mismatch. This focused comparison covers the specification strip, values, labels, and first editorial anchor. A separate focused statement capture was required because its new image is an intentional replacement rather than a copy of the prior video frame.

### Findings and iteration history

- [P1 fixed] Specification values hidden by the fixed header at compact desktop widths.
  Evidence: the first in-app capture exposed only labels and body copy; the `strong` value row sat beneath the 80 px fixed header.
  Fix: reserved `--header-h` within `.overview-section` so the three primary values begin below the header.
  Post-fix: the comparison capture shows `30 dB*`, `40 m³/h`, and `POWER / USB` intact in all three columns.

- [P2 fixed] Legacy pixel minimum heights broke the whole-page deck on a 654 px-high desktop viewport.
  Evidence: `.film-section` resolved to 680 px, placing film metadata below the viewport.
  Fix: overview, film, spaces, and statement now use their live `100svh` height inside the desktop deck; the longer contact form remains intentionally scrollable.
  Post-fix: the film frame resolves to 653.8 px and its metadata ends at 630.1 px, within the viewport.

- [P1 fixed] Header tone did not react to nested information-deck scrolling.
  Evidence: the dark statement page retained the preceding pale header, despite the declared dark-surface behavior.
  Fix: connected the update scheduler to `.information-pages` scroll events as well as window scroll.
  Post-fix: statement capture uses `data-story-tone="dark"`, an rgba(6, 7, 7, 0.92) header, and light navigation text; the consultation page correctly returns to light.

### Required fidelity surfaces

- Typography and copy: source Japanese values, labels, unit notation, and the `MADE FOR FOCUS` hierarchy are retained; no wrapping/truncation remains in the tested desktop view.
- Spacing and rhythm: the top safety inset is intentional to accommodate the persistent 80 px header; the specification strip, editorial anchor, and full-viewport transitions remain evenly spaced.
- Colors and tokens: pale product-information pages use the light header treatment; the static lifestyle statement and footer use the dark header treatment for contrast.
- Image quality and asset fidelity: the generated static WebP is sharp at the rendered size, shows the sage SNAPOD product accurately, and leaves an uncluttered dark copy field; no video element remains in the statement section.
- Content and affordances: film play/pause, statement CTA, navigation anchors, and consultation page remained present in the DOM; no copy or action was removed for the layout correction.

### Residual test gap

- The in-app browser was available at the desktop viewport only for this iteration. Mobile rules retain natural scrolling and the dedicated `--header-h` inset, but this final pass did not capture a separate 375 px device viewport.

final result: passed

## Statement scene replacement — 2026-08-24

Source truth: the user-selected `ENGINEERED QUIET` module and the newly generated SNAPOD lifestyle asset `public/assets/scenes/quiet-work-statement-v1.webp`.

- Replaced the full-bleed background video with one static, project-local WebP scene; the rendered section contains zero video elements.
- The generated scene preserves the booth's sage exterior, charcoal frame, gray felt interior, integrated desk/light/stool, and credible one-person scale.
- The worker and product remain in the right half while the left side stays low-detail and dark enough for the existing Japanese headline and CTA.
- The existing module typography, CTA behavior, full-height composition, header treatment, and desktop information-page snap behavior remain unchanged.
- Verified in the in-app browser: the 1672 × 941 source image loaded completely, covered the full section, and the CTA remained visible and interactive.
- Final implementation capture: `qa/snapod/implementation-statement-static-scene-final.png` (961 × 648).
- No P0/P1/P2 clipping, missing-asset, contrast, or layout regression was found in this scoped revision.

final result: passed
