# ÉPOCA keyword-to-page map

Last reviewed: 2026-08-27  
Owner: ÉPOCA content/catalog owner  
Status: structure approved; inventory-led commercial rows blocked until real production catalog exists

This is a publishing ledger, not a page generator. A row becomes indexable only when real verified inventory or a distinct reviewed buyer need supports it. The 5,000 local `SYN-*` records are synthetic test data and must never justify production copy.

## Permanent pages

| Buyer need                   | Georgian target                       | English target                   | German target                  | Russian target                    | Page                    | Status                                                    |
| ---------------------------- | ------------------------------------- | -------------------------------- | ------------------------------ | --------------------------------- | ----------------------- | --------------------------------------------------------- |
| Understand ÉPOCA             | ÉPOCA ხალიჩები; კოლექციონერის ინდექსი | ÉPOCA carpets; collector’s index | ÉPOCA Teppiche; Sammlerindex   | ковры ÉPOCA; индекс коллекционера | `/{locale}`             | Eligible after domain/catalog activation                  |
| Browse curated groups        | ხალიჩების კოლექციები                  | curated carpet collections       | kuratierte Teppichkollektionen | кураторские коллекции ковров      | `/{locale}/collections` | Implemented; child collections require verified inventory |
| Delivery facts               | ხალიჩის მიწოდება                      | carpet delivery from Georgia     | Teppichversand aus Georgien    | доставка ковров из Грузии         | `/{locale}/delivery`    | No-index until legal/delivery approval                    |
| Return facts                 | ხალიჩის დაბრუნება                     | carpet returns                   | Teppichrückgabe                | возврат ковра                     | `/{locale}/returns`     | No-index until legal approval                             |
| Product and buying questions | ხალიჩის შეძენა კითხვები               | buying a carpet FAQ              | Teppich kaufen Fragen          | вопросы о покупке ковра           | `/{locale}/faq`         | Eligible after content review                             |

## Inventory-driven collection candidates

Create one curated page only when the catalog query returns a meaningful, stable group and an editor can write a distinct introduction. Do not publish an empty page or one-product keyword variation.

| Facet                    | Example intent families in all four locales      | Required evidence                                         | Destination rule                                          |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------- |
| Carpet type/construction | runner, flatwoven, hand-knotted                  | Verified construction plus enough active products         | One manual collection with reviewed locale slugs/copy     |
| Size/shape               | runner, large, small, round                      | Verified dimensions/shape; explain measurement convention | Curated collection, never every numeric range             |
| Material                 | wool, silk, wool-and-silk                        | Verified material for every member                        | Curated collection only when inventory is durable         |
| Colour                   | indigo, ivory, oxblood, neutral                  | Reviewed product colour and photography caveat            | Curated collection; keep arbitrary color filters no-index |
| Origin                   | Georgian, Persian, Anatolian, Caucasian or other | `origin_verified=true`; attributable provenance           | Collection or journal only; never infer from style        |
| Condition/age            | vintage, antique, restored                       | Verified condition and age/provenance                     | Explain grading; no unsupported age claims                |
| Room/use                 | hallway, living room, dining area                | Dimensions, durability/care, and genuine buyer guidance   | Editorial-led collection, not keyword substitution        |
| Care                     | wool care, vintage carpet care, stain response   | Reviewed care guidance and policy                         | Journal article linked from relevant products             |

## Editorial candidates

| Buyer question                      | Evidence before publishing                                           | Internal links                                 |
| ----------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| How ÉPOCA measures a carpet         | Approved measurement method and product dimensions                   | Matching size collections and products         |
| How to read condition notes         | Approved condition vocabulary; no restoration claim without evidence | Products by condition plus FAQ/contact         |
| Choosing a carpet for a room        | Verified size/material/care facts                                    | Curated room-use collections                   |
| Caring for wool and vintage carpets | Professional reviewed care guidance                                  | Relevant products, delivery, returns           |
| Why colour varies on screen         | Approved photography/color disclosure                                | Product galleries and contact                  |
| Delivery from Georgia or Germany/EU | Seller/origin/carrier/tax facts approved by market                   | Delivery, returns, relevant market collections |

## Publishing rule

For each proposed page, record its stable identity, four reviewed locale slugs/titles/descriptions, supporting product IDs or source evidence, intended collection/article links, owner, and review date. Search, sort, currency, tracking, and arbitrary facet combinations stay `noindex,follow` and canonicalize to a clean page. Never buy links or create automated keyword variants.
