# Design QA

## Review scope

- Prototype: `http://127.0.0.1:4174/`
- Review date: 2026-08-07
- Source direction: the live Lightweight opening sequence and scroll choreography, browser annotations, and the supplied SNAPOD exploded-view video.
- Responsive states: default desktop viewport and `390 × 844` mobile viewport.
- Final evidence: the prior annotation and exploded-view captures plus `qa/reference-lightweight-loader-desktop.png`, `qa/reference-lightweight-product-reveal-mobile.png`, `qa/reference-lightweight-title-reveal-mobile.png`, `qa/reference-lightweight-hero-mobile.png`, `qa/intro-loader-desktop.png`, `qa/loader-progress-desktop.png`, `qa/intro-product-desktop.png`, `qa/intro-title-desktop.png`, `qa/intro-hero-desktop.png`, `qa/intro-loader-mobile.png`, `qa/intro-product-mobile.png`, `qa/intro-title-mobile.png`, `qa/intro-hero-mobile.png`, `qa/layers-exploded-desktop.png`, `qa/layers-exploded-mobile.png`, the `qa/layers-scroll-transition-*` captures, and the `qa/layers-single-object-*` captures.

## Annotation acceptance

1. Opening product scale and angle
   - The product enters at a 45-degree angle.
   - Desktop width is approximately half the viewport before rotation; mobile is proportionally reduced to avoid horizontal clipping.
   - The tilt resolves into the established chapter choreography after the opening section.
2. Transparent product renders
   - Sage, sand, and coral renders are project-local PNG cutouts with alpha transparency.
   - White studio backgrounds are absent in the dark hero, color chapter, and final form chapter.
3. Local scene video
   - The first wide placement card uses `public/assets/video/snapod-story.mp4`.
   - The local H.264 asset uses muted autoplay, looping, inline playback, metadata preload, and a local poster image.
4. Music-wave background
   - The former orbit/grid graphic is replaced by a layered animated waveform and equalizer field drawn on canvas.
   - Wave color follows the story transition and amplitude responds to scroll progress.
   - Reduced-motion users receive a static waveform frame.
5. Exploded-view structure showcase
   - The supplied 10-second H.264 video is placed after product specifications and before installation scenes.
   - It autoplays muted, loops inline, includes a local poster, and offers an accessible play/pause control.
   - Reduced-motion users receive a paused poster state that they can start manually.
6. Lightweight-inspired opening sequence
   - Fresh top-of-page loads begin with a centered progress bar and live percentage on black, followed by a full-screen product close-up that scales and rotates into the established hero position.
   - Progress follows completion of critical product images, scene images, local font readiness, and both local videos' metadata, with a short minimum display time to prevent flashing.
   - At 100%, the loader wipes upward while the product sequence begins; header, frame, navigation rail, waveform, eyebrow, horizontally masked headline, and CTA then enter in separate phases.
   - The sequence is skipped for reduced-motion users and non-top hash targets; scrolling is unlocked before the CTA becomes interactive.

## Japanese localization review

- Document language, metadata, navigation, search, chapter labels, headings, body copy, specifications, captions, CTAs, accessibility labels, and footer copy are Japanese.
- Copy uses concise Japanese ecommerce phrasing while retaining the SNAPOD and SPD01 product names.
- Performance claims include qualifiers such as `最大`, `目安`, and condition notes instead of unconditional guarantees.
- Units use localized, readable notation: `最大 30 dB`, `40 m³/h`, `1 台`, and `最短 5 分`.
- Search was tested with `換気`; it returned the localized material result.

## Visual findings and fixes

1. `[P2]` The color chapter rail initially landed before the product completed its transition, causing text overlap.
   - Fix: moved the chapter target to progress `0.72`.
   - Result: resolved in `qa/annotation-desktop-color.png`.
2. `[P2]` The final form chapter inherited the opening 45-degree rotation.
   - Fix: explicitly reset product rotation to `0deg` in the final scroll segment.
   - Result: resolved in `qa/annotation-desktop-form.png`.
3. `[P2]` The Japanese placement headline wrapped to an orphaned final character on mobile.
   - Fix: adjusted the mobile display type scale while preserving the desktop hierarchy.
   - Result: resolved in `qa/annotation-mobile-video.png`.
4. `[P2]` The Layers chapter allowed the heading and material callouts to cross the product during the handoff.
   - Fix: completed the product move to the right by progress `0.40`, aligned the callouts outside its silhouette, and shortened the leader lines.
   - Result: resolved in `qa/annotation-v2-desktop-layers.png`.
5. `[P2]` The opening product sat too high in the viewport.
   - Fix: lowered the opening composition while preserving its scale and tilt.
   - Result: resolved in `qa/annotation-v2-desktop-hero.png` and `qa/annotation-v2-mobile-hero.png`.
6. `[P2]` The Focus product silhouette crossed the headline and body copy.
   - Fix: shifted the product into the left column early in the transition, reduced the Focus-stage scale, and constrained copy to a dedicated `43vw` right column.
   - Result: resolved in `qa/annotation-v3-desktop-focus.png`.
7. `[P2]` The opening product still began behind the CTA.
   - Fix: moved the desktop product anchor to `66vh`, placing its first visible edge below the CTA and allowing intentional bottom cropping; the mobile composition is unchanged.
   - Result: resolved in `qa/annotation-v3-desktop-hero.png` and `qa/annotation-v3-mobile-hero.png`.
8. `[P2]` The exploded-view asset needed a clear place in the existing story sequence and a mobile-safe presentation.
   - Fix: inserted a dedicated dark bridge section between specifications and installation scenes, preserved the native video composition on desktop, and used a `4 / 3` crop with stacked component labels on mobile.
   - Result: resolved in `qa/exploded-desktop-heading.png`, `qa/exploded-desktop-video.png`, and `qa/exploded-mobile.png`.
9. `[P2]` The local hero previously appeared immediately and omitted the reference site's loading and staged entrance choreography.
   - Fix: added a matching multi-phase preloader, product close-up transition, delayed chrome/frame reveal, horizontal title mask, and final CTA entrance while preserving the existing end-state composition.
   - Result: resolved on desktop and mobile in the `qa/intro-*` captures, compared against the corresponding `qa/reference-lightweight-*` frames.
10. `[P2]` The Layers progress state still showed the assembled booth even though the chapter describes its multi-layer construction.
   - Fix: generated a transparent exploded assembly from the supplied product video, crossfaded it into the right-hand product zone only during `02 / 多層構造`, aligned the three callouts around the separated components, and stacked the asset below the copy on mobile.
   - Result: resolved in `qa/layers-exploded-desktop.png` and `qa/layers-exploded-mobile.png`; the exploded visual returns to zero opacity in the Focus and Color stages.
11. `[P2]` The assembled-to-exploded handoff was a static crossfade and did not feel connected to the preceding scroll choreography.
   - Fix: split the existing transparent render into scroll-controlled core, roof, felt, and shell layers. The parts begin clustered over the assembled booth, ease into their final positions, then regroup before the next chapter; callouts enter with the separation progress and reduced-motion users receive the complete static view.
   - Result: the fully open state remains visually identical to the approved layout, while intermediate desktop and mobile states pass in `qa/layers-scroll-transition-desktop-mid.png`, `qa/layers-scroll-transition-desktop-open.png`, `qa/layers-scroll-transition-mobile-mid.png`, and `qa/layers-scroll-transition-mobile-open.png`.
12. `[P2]` During the crossfade, the assembled booth and regrouped exploded render still read as two adjacent objects.
   - Fix: bound both renders to the same responsive center and vertical anchor during entry and exit, delayed component separation until the assembled render has faded, completed regrouping before the next chapter begins, and shortened the final crossfade after alignment.
   - Result: the transition reads as one object changing state on desktop and mobile in `qa/layers-single-object-enter-desktop.png`, `qa/layers-single-object-next-desktop.png`, and `qa/layers-single-object-enter-mobile.png`.
13. `[P2]` The opening loader showed only a time-based bar, so it could not communicate actual asset readiness or a numeric loading state.
   - Fix: replaced the fixed animation with task-driven progress for critical images, fonts, and video metadata; added a tabular live percentage and delayed the product reveal until 100%.
   - Result: the line position and proportions match the supplied `1920 × 929` reference in `qa/loader-progress-desktop.png`; the `390 × 844` state has no horizontal overflow, the progress semantics update, and the 100% wipe connects cleanly to the existing intro.

## Functional checks

- Header navigation anchors, the new structure-analysis anchor, and the mobile menu.
- Chapter rail jumps for Focus, color, and final form states.
- Chapter rail jump for Layers now lands on the fully expanded structure state; Focus and Color restore the assembled product.
- Search overlay, Japanese query filtering, and close behavior.
- Both local videos render on desktop and mobile; exploded-view play/pause state was exercised in-browser.
- Fresh-load asset-driven percentage, 100% loader exit, body scroll lock release, title/CTA completion, and CTA transition into the Focus chapter.
- Desktop and mobile opening composition.
- Production build and Sites packaging.

## Verification

- `npm run build`: passed.
- `npm run test:sites`: 4/4 passed.
- Browser console warnings/errors during loader completion: none.
- Final viewport override was reset after responsive testing.

final result: passed
