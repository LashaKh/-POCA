# ÉPOCA Product Context

## Product

ÉPOCA is an online carpet shop. Its first public experience should make carpets feel collectible and tactile while giving shoppers enough concrete information to choose with confidence.

## Current Stage

The Collector’s Index direction is selected, the production product brief is approved, and the first production-shop specification, plan, and task set exist in `specs/001-build-production-shop/`. The later two-seller operating decision below must be reconciled before seller-sensitive commerce work proceeds.

## Business Operating Strategy

`docs/business/OPERATING_AND_GO_TO_MARKET_STRATEGY.md` records the later business decision to run one ÉPOCA brand through two seller-specific operations: a German sole proprietorship for German/EU-held stock and a Georgian company for Georgian-held stock. It also records the staged market-entry and buyer-acquisition plan.

This decision conflicts with the original single-Georgian-merchant and non-marketplace assumptions in the master goal and `specs/001-build-production-shop/`. Before implementing checkout, payments, invoices, refunds, seller policies, or marketplace feeds, reconcile those artifacts through specification clarification. Do not silently mix sellers or settle one seller's retail receipts into the other seller's merchant account.

## Known Product Intent

- Sell carpets through a premium, editorial, image-led storefront.
- Balance atmosphere with commercial clarity: beauty should invite attention, while dimensions, material, price, condition, availability, care, and delivery facts should be easy to find when they are in scope.
- Build trust through truthful product information and transparent policies, not artificial urgency or unsupported prestige signals.
- Treat mobile, keyboard, assistive-technology, reduced-motion, slow-network, and missing-media experiences as first-class cases.
- Keep the first release as small as possible while preserving a complete buying journey.
- Launch seller-specific operations in Georgia and Germany with Georgian, English, German, and Russian storefront support; activate delivery countries gradually rather than promising unverified worldwide delivery.
- Give the Owner and Manager a complete operational administration system.
- Make product and photo ingestion highly automated while requiring human verification before publication.
- Use Supabase as the backend platform and Netlify for initial hosting; payment activation credentials will follow later.

## Activation Inputs Still Required

The implementation must provide configuration and runbooks without inventing:

- Legal entity, VAT/tax/invoice details, bank-transfer instructions, and reviewed business policies.
- Payment merchant approval, enabled methods/currencies, and sandbox/live credentials.
- Real destination-specific shipping zones, prices, carriers, estimates, and customs/duties wording for each activated seller and market.
- Domain, transactional email, support, AI-drafting, analytics, consent, and monitoring credentials.
- Verified product records and owned/licensed production imagery.

## Content Integrity

- Use “Concept only — sample content” on exploratory pages.
- Do not publish invented reviews, press logos, artisan stories, sustainability claims, provenance, scarcity, discounts, or delivery promises.
- Product imagery must be owned, licensed, or linked to a recorded source. Keep its crop and color treatment honest.
- Replace sample names, prices, dimensions, and copy with verified catalog data before launch.

## Experience Mode

The storefront is primarily a **persuasion surface** (it helps a visitor understand and desire the product) with selected **experience moments** (it creates atmosphere through imagery, type, rhythm, and restrained motion). Product evaluation and checkout remain direct and operational.

## Source Material

The selected Collector’s Index direction draws principles—not copied layouts—from:

- [Designing with Impeccable](https://impeccable.style/designing/)
- [Impeccable repository](https://github.com/pbakaus/impeccable)
- [Meng To Skills repository](https://github.com/MengTo/Skills)
- The four supplied Lulu and Georgia and Selency reference screenshots.
