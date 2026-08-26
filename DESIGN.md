# ÉPOCA Design Authority

**Status:** Selected — Direction 03, Collector’s Index

This file is the visual source of truth for ÉPOCA. Collector’s Index is the approved direction for every customer-facing specification, plan, task, implementation, and visual audit. The other concepts remain historical exploration only and must not be blended into the production vocabulary.

## Design Thesis

ÉPOCA should feel like an editorial gallery with commercial clarity: carpets are presented as objects with texture, history, and presence, while navigation and product facts stay calm, legible, and useful.

## Shared Principles

1. **Photography leads.** Use generous, well-cropped room or textile imagery as structure, not decoration.
2. **Type creates hierarchy.** Pair an expressive editorial serif with a precise sans serif. Let scale and spacing do more work than borders, shadows, or badges.
3. **The palette stays material.** Build from wool, paper, ink, clay, tobacco, oxblood, olive, and indigo. Use one dominant field and one disciplined accent per direction.
4. **Commerce remains quiet and clear.** Search, navigation, product names, prices, dimensions, availability, and actions must never be sacrificed for atmosphere.
5. **Rhythm beats ornament.** Alternate wide cinematic moments with disciplined grids and deliberate whitespace. Avoid generic card walls, glass effects, gradient decoration, and ornamental pills.
6. **Motion has a narrative.** Use restrained reveals, image drift, or marquees only to reinforce materiality or progression. Content is visible without JavaScript and motion stops when reduced motion is requested.
7. **States are designed.** Loading, empty, error, unavailable, focus, hover, pressed, long-copy, missing-media, and narrow-screen behavior belong to the composition.
8. **Evidence before claims.** No fake reviews, logos, awards, scarcity, discounts, provenance, or sustainability language.

## Common Interface Rules

### Typography

- Use no more than one display serif and one utility sans family in a direction.
- Headlines may be dramatic; product facts and controls must remain highly legible.
- Avoid tiny body copy. Use fluid type carefully so mobile hierarchy remains intentional.
- Keep labels concise and use uppercase tracking sparingly for navigation or taxonomy.

### Color and contrast

- Warm off-white replaces sterile white where appropriate.
- Near-black replaces pure black for large fields unless the direction calls for a sharper graphic contrast.
- Accent colors must pass contrast for the text or control role in which they appear.
- Never use color as the only signal for availability, selection, or errors.

### Imagery

- Record the creator/source and usage link in `design-directions/assets/SOURCES.md`.
- Define an intentional aspect ratio and focal crop at phone, tablet, and desktop widths.
- Provide useful alt text for informative images and empty alt text for decorative crops.
- Prefer responsive local images, lazy-load below-the-fold media, and reserve layout space.
- Never stretch, over-filter, or recolor an image so heavily that the product becomes misleading.

### Interaction and accessibility

- Use semantic landmarks, headings, links, buttons, and lists.
- Make focus clearly visible and keyboard order match the visual order.
- Keep touch targets comfortably operable and avoid hover-only information.
- Support `prefers-reduced-motion`; do not require animation or smooth scrolling to understand the page.
- Preserve meaningful content and actions when JavaScript is unavailable.

### Responsive composition

- **Phone, 390px:** single-column narrative, concise header, readable overlays, no clipped text or horizontal overflow.
- **Tablet, 768px:** deliberate intermediate composition rather than a scaled-down desktop.
- **Desktop, 1440px:** use asymmetry, cinematic image scale, and generous space without making controls remote.

## Selected Direction — Collector’s Index

Collector’s Index uses warm paper fields, near-black typography, disciplined catalog grids, stable image crops, concise metadata, and curatorial editorial interludes. It should feel knowledgeable, collectible, product-first, and calm under a large catalog.

### Production vocabulary

- **Palette:** warm paper and ivory surfaces, near-black ink, muted stone metadata, and one restrained material accent when state or hierarchy requires it.
- **Typography:** one expressive editorial serif for display hierarchy and one precise sans serif for navigation, controls, prices, metadata, and administration.
- **Layout:** hard rules, intentional whitespace, stable grids, large editorial headings, image-led product records, and asymmetric story sections used sparingly.
- **Product cards:** images and verified facts lead; avoid rounded generic cards, floating shadows, decorative badges, and hover-dependent information.
- **Administration:** use the same typographic discipline and clarity, but favor operational density, predictable controls, tables where comparison matters, and explicit state labels.
- **Motion:** subtle image or text transitions only after static content works; no smooth-scroll dependency or animation that delays catalog use.
- **Reference implementation:** `design-directions/option-03-collectors-index.html` and its verified viewport captures establish the approved starting composition, not final pixel specifications.

## Archived exploration

Directions 01 Atelier Editorial, 02 Gallery Monolith, and 04 Living Archive remain in `design-directions/` for historical comparison. They are not production authorities.
