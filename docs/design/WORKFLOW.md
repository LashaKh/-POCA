# ÉPOCA Storefront Design Workflow

## Why this workflow exists

A design workflow is like a weaving pattern: it keeps each new page related to the whole collection while still leaving room for a distinctive composition. Use this workflow for any customer-facing ÉPOCA surface.

## 1. Context

Read `PRODUCT.md`, `DESIGN.md`, the relevant feature artifacts, and existing interface code. Identify:

- The visitor's goal and the truthful information needed to complete it.
- The page mode: persuade, operate, read, or experience. Storefront landing pages normally persuade with selected experience moments; catalog and checkout surfaces operate.
- The selected direction and existing primitives that must be reused.
- Content, media, data, and state assumptions that still need validation.

Do not build a polished answer around invented product facts.

## 2. Shape

Write a short art-direction brief before code:

- One-sentence emotional goal.
- Dominant composition and image behavior.
- Type relationship, palette, density, and rhythm.
- Primary action and essential product facts.
- Phone, tablet, and desktop adaptations.
- Loading, empty, error, unavailable, long-copy, focus, and reduced-motion behavior.

For major new surfaces, make a code-native concept or wireframe that can be inspected in a browser.

## 3. Build

- Start with semantic content and usable actions.
- Apply shared tokens and primitives before adding page-specific styling.
- Keep important content visible before JavaScript runs.
- Use responsive, attributable images with deliberate crops and reserved space.
- Add only the minimum motion that advances the page narrative.
- Implement narrow screens and interaction states during the build, not after it.

## 4. Two-pass visual QA

### Pass A — composition and journey

Render at 390px, 768px, and 1440px. Check hierarchy, crop, rhythm, overflow, navigation, action prominence, product truth, and whether the page still expresses the selected direction.

### Pass B — hardening and polish

After fixes, re-render the affected sizes. Check keyboard order, focus visibility, semantics, contrast, touch targets, missing media, long text, loading/error/unavailable states, reduced motion, image performance, and layout stability.

Stop after the second pass unless a critical defect remains. Record evidence rather than declaring the design “good” without renders or tests.

## 5. Maintain

Extract a shared token or component only when it is already repeated or clearly planned for multiple consumers. Update `DESIGN.md` when an approved decision changes the visual system; do not let individual pages create a shadow design language.
