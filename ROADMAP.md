# Website roadmap

Keep the current static site and black/white surfaces with Mirality green accents. These follow-ups should not delay publishing the current content.

## Loading and media

- [ ] Add intrinsic width and height to content images, preserving responsive sizing, to reserve space and reduce layout shifts.
- [ ] Lazy-load the remaining eager image in the redesign comparison (`assets/object-before.png`).
- [ ] Evaluate WebP for larger screenshots; compare readability and transfer size before replacing PNGs.
- [x] Keep videos unchanged: all three use `preload="none"` to avoid eager video downloads.

## Accessibility

- [ ] Convert homepage claim switchers to keyboard-operable buttons with visible focus and an exposed selected state. Preserve scroll-driven switching and avoid moving focus when scrolling.
- [ ] Use h2 and h3 for article sections and subsections while preserving the current visual style.
- [ ] Make image enlargement controls keyboard-operable; give the lightbox dialog semantics, a labelled close button, focus management, Escape dismissal and focus restoration.
- [ ] Give the redesign before/after comparison a labelled range input with arrow-key support while preserving pointer and touch interaction.
- [ ] Review light-mode button contrast using the separate comparison page before choosing a palette change.

## SEO and sharing

- [x] Add sitemap.xml listing the three content URLs; exclude the redirect, verification file and contrast preview.
- [x] Add robots.txt referencing the sitemap.
- [ ] Add self-referencing canonical tags to the homepage and redesign article. The AI-first ops article already has one.
- [ ] Add homepage Person/ProfilePage and case-study Article JSON-LD using visible, verified facts.
- [ ] Create a social-preview image and add matching Open Graph and Twitter image metadata.
- [ ] After deployment, verify public sitemap/robots responses and submit the sitemap in Search Console.

## Reuse

- [ ] Extract duplicated article CSS and lightbox/table-of-contents behavior without changing the design.
- [ ] Later migrate suvorav.com to apps/suvorav-site and consume the existing ohsuvorav-ui package used by Mirality and mirality-site.
