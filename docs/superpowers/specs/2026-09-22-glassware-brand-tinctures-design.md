# Spec: Glassware category and brand CBD tinctures

Approved by the user 2026-09-22. 31 glassware + 8 brand tinctures = 39 new products (7 categories, 74 products, 73 active).

## 0. Risks and decisions
- R1 Federal hemp cap (~0.4 mg total THC/container, ~Nov 2026): full-spectrum brand tinctures and house full-spectrum oils likely exceed it; review with counsel.
- R2 Water pipes are "paraphernalia" for processors; get approval before checkout.
- R3 Deliberate exception to Addendum A photo rule 6: real brand product shots with brand labels/pipes are allowed for these 39 items. Still banned: THC branding, cannabis leaves, watermarks, other shops' logos, smoke, people.
- R4 Image licence: manufacturer/retailer photos; confirm permission with brands or replace before launch.
- R5 Old Phase 2 preview shows Glassware with broken images after the Neon reseed until the new preview is deployed.
- D1 Innovative CBD excluded (label shows THC 50 mg + cannabis leaf). D2 All 7 Puffco excluded (battery vaporizers, PACT Act). D3 Rick and Morty ×4 and The Child excluded (unlicensed art); keep Higher Standards K. Haring (confirm licence). D4 Glasscity beaker excluded (shop logo). D5 Duplicate `hand-pipe-4″-spiral-2` excluded.
- D6 No Glassware home row. D7 `describeStore`: flag on "…plus smoking accessories, glassware and hemp pre-rolls."; flag off "…plus smoking accessories and glassware." D8 Glassware sortOrder 7 (hemp-pre-rolls stays 6). D9 No new product featured. D10 Tincture variant name "<total mg> mg" = `specs.strengthMg`. D11 21+ already site-wide.
- Defaults: one "One size" variant for hand pipes ("colour varies" in copy); no "for tobacco use" line.

## 1. Selection (over products.json)
Glassware = `category == "Bongs"` (45) minus denylist: all `puffco-*` (7); `8-rick-and-morty-bent-neck-assorted-graphic-beaker-bong`, `hillside-glass-10-glow-rick-and-morty-graphic-beaker-bong-assorted-graphics`, `morty-smith-silicone-and-glass-beaker-bong`, `rick-and-morty-8-beaker-bong`, `the-child-silicone-and-glass-beaker-bong`; `glasscity-beaker-ice-bong-10-inch-greyish`; `hand-pipe-4%e2%80%b3-spiral-2`. Result 31. Tinctures = explicit allowlist (table B).

### Table A: Glassware (specs null, variant `{ key: "single", name: "One size" }`, SKU `HB-GLS-<KEY>`, price parsed from `price`)
| # | our slug | source slug | name | cents | key |
|---|---|---|---|---|---|
|1|eyeball-monster-beaker|12-inch-halloween-eyeball-monster-beaker-bong-themed-big-glass-water-pipe-w-ice-catcher|Eyeball monster beaker, 12 in|13500|EYEBALL|
|2|iridescent-beaker-16in|16-iridescent-beaker-bong|Iridescent beaker, 16 in|10000|IRID16|
|3|bubble-beaker-8in|8-bubble-beaker-bong|Bubble beaker, 8 in|2800|BUBBLE8|
|4|honey-water-pipe|bong-glass-honey-32cm|Honey glass water pipe, 32 cm|10000|HONEY|
|5|ice-alien-water-pipe|bong-glass-ice-alien-35cm|Ice alien water pipe, 35 cm|10000|ICEALIEN|
|6|yellow-cyclops-beaker|creepy-yellow-underwater-cyclops-beaker-bong-monster-dab-rig-big-thick-waterpipe-w-ice-pinch|Yellow cyclops beaker, 12.6 in|13500|CYCLOPS|
|7|famous-design-papaya-beaker|famous-design-papaya-12-in-beaker-water-pipe|Famous Design papaya beaker, 12 in|10000|PAPAYA|
|8|glow-frog-beaker|frog-da-smoker-12-5%e2%80%b3-glow-in-the-dark-beaker-bong|Glow-in-the-dark frog beaker, 12.5 in|11500|FROG|
|9|chongz-ollie-water-pipe|glass-bong-chongz-ollie-21cm|Chongz Ollie water pipe, 21 cm|12000|OLLIE|
|10|green-alien-bubbler|glass-bong-green-alien-bubbler-17cm|Green alien bubbler, 17 cm|9000|GALIEN|
|11|ice-bob-alien-water-pipe|glass-bong-ice-bob-alien-green-35cm|Ice Bob green alien water pipe, 35 cm|10000|ICEBOB|
|12|flower-skull-water-pipe|glass-bong-mexican-flower-skull-26cm|Flower skull water pipe, 26 cm|10000|SKULL|
|13|mini-mushroom-water-pipe|glass-bong-mini-mushroom-17cm|Mini mushroom water pipe, 17 cm|10000|MUSHROOM|
|14|hand-pipe-3in-assorted|hand-pipe-3%e2%80%b3-assorted|Hand pipe, 3 in, assorted colours|1000|HP3|
|15|frit-cap-hand-pipe-3in|hand-pipe-3%e2%80%b3-fumed-frit-cap|Fumed frit cap hand pipe, 3 in|1000|HP3FRIT|
|16|frit-dust-hand-pipe-4in|hand-pipe-4%e2%80%b3-fumed-frit-dust|Fumed frit dust hand pipe, 4 in|2000|HP4DUST|
|17|slyme-hand-pipe-4in|hand-pipe-4%e2%80%b3-slyme|Slyme hand pipe, 4 in|2000|HP4SLYME|
|18|spiral-hand-pipe-4in|hand-pipe-4%e2%80%b3-spiral|Spiral hand pipe, 4 in|2000|HP4SPIRAL|
|19|two-tone-hand-pipe-4in|hand-pipe-4%e2%80%b3-two-tone|Two-tone hand pipe, 4 in|2000|HP4TWO|
|20|hemper-popcorn-xl|hemper-popcorn-xl-bong-9%e2%80%b3|Hemper Popcorn XL water pipe, 9 in|19900|POPCORN|
|21|higher-standards-haring-water-pipe|higher-standards-k-haring-water-pipe|Higher Standards K. Haring water pipe|16000|HARING|
|22|hillside-honeycomb-beaker|hillside-glass-14-metallic-honeycomb-beaker-bong|Hillside Glass metallic honeycomb beaker, 14 in|8700|HONEYCOMB|
|23|hillside-gold-beaker|hillside-glass-8-gold-iridescent-beaker-bong|Hillside Glass gold iridescent beaker, 8 in|3900|GOLD8|
|24|hillside-iridescent-bubble|hillside-glass-8-iridescent-bubble-bong|Hillside Glass iridescent bubble, 8 in|3100|IRIDBUB8|
|25|glass-clay-monster|monster-glass-clay-bong-16cm-yellow|Yellow glass-clay monster water pipe, 16 cm|10000|CLAYMONSTER|
|26|oil-slick-beaker|oil-slick-beaker|Oil slick beaker, 8 in|9000|OILSLICK|
|27|quartz-banger-10mm|quartz-banger-nail-10mm-90-degree-male|Quartz banger, 10 mm male, 90°|1500|BANGER10|
|28|quartz-banger-18mm|quartz-banger-nail-18mm-90-degree-male|Quartz banger, 18 mm male, 90°|1500|BANGER18|
|29|moai-silicone-water-pipe|silicone-bong-moai-easter-island-head-20-cm|Moai silicone water pipe, 20 cm|8000|MOAI|
|30|owl-silicone-water-pipe|silicone-bong-owl-16-cm|Owl silicone water pipe, 16 cm|9900|OWL|
|31|stundenglass-gravity-infuser|stundenglass-gravity-infuser-polished-silver|Stündenglass gravity infuser, polished silver|79900|STUNDEN|

Local source file = the entry's `image` field (e.g. `images/st-ndenglass-gravity-infuser-polished-silver.png`) → `public/images/products/glassware/<our slug>.jpg`.

### Table B: Brand tinctures (category `tinctures`; one variant `{ key: "<mg>", name: "<mg> mg" }`; specs strengthMg = CBD mg, labTested true, servingSize "1 mL"; spectrum: label in photo wins over name)
| our slug | source slug | name | mg | cents | spectrum | ingredients | SKU |
|---|---|---|---|---|---|---|---|
|cbdfx-cbd-cbg-oil|cbdfx-cbd-cbg-oil-wellness-tincture-full-spectrum-1fl-oz-250mg-cbg-500mg-cbd|CBDfx CBD + CBG oil, 30 mL|500|3399|from label|hemp extract, CBG, curcumin, coenzyme Q10, terpene blend|HB-TIN-CBDFX|
|farmhouse-rosin-drops-mint|farmhouse-hemp-rosin-drops-cbd-oil-mint-full-spectrum-2fl-oz-2000mg-cbd|Farmhouse Hemp rosin drops, mint, 60 mL|2000|8800|full|hemp rosin, carrier oil, mint flavor|HB-TIN-FARMHOUSE|
|koi-cbd-orange-oil|koi-cbd-cbd-oil-tincture-broad-spectrum-orange-1fl-oz-1000mg-cbd|Koi CBD orange oil, 30 mL|1000|5500|full (label)|carrier oil, hemp extract, orange flavor|HB-TIN-KOI|
|lazarus-full-spectrum-oil|lazarus-naturals-cbd-tincture-full-spectrum-4fl-oz-6000mg-cbd|Lazarus Naturals full-spectrum oil, 120 mL|6000|8900|full|carrier oil, full-spectrum hemp extract|HB-TIN-LAZARUS|
|lazarus-chocolate-mint-oil|lazarus-naturals-chocolate-mint-flavored-high-potency-full-spectrum-cbd-tincture-oil-4fl-oz-6000mg-cbd|Lazarus Naturals chocolate mint oil, 120 mL|6000|8999|full|carrier oil, full-spectrum hemp extract, chocolate mint flavor|HB-TIN-LAZMINT|
|myriams-hope-daily-50|myriams-hope-hemp-cbd-oil-daily-50-full-spectrum-olive-1fl-oz-1500mg-cbd|Myriam's Hope Daily 50 olive oil drops, 30 mL|1500|7500|full|olive oil, full-spectrum hemp extract|HB-TIN-MYRIAM|
|nuleaf-full-spectrum-oil|nuleaf-naturals-hemp-cbd-oil-full-spectrum-1-69fl-oz-3000mg-cbd|NuLeaf Naturals full-spectrum oil, 50 mL|3000|11800|full|carrier oil, full-spectrum hemp extract|HB-TIN-NULEAF|
|pure-spectrum-broad-oil|pure-spectrum-cannabidiol-oil-natural-flavor-broad-spectrum-thc-free-2fl-oz-2500mg-cbd|Pure Spectrum broad-spectrum oil, natural, 60 mL|2500|15600|broad|MCT oil, broad-spectrum hemp extract, terpenes|HB-TIN-PURESPEC|

(Match source slugs against products.json exactly; encoding of ″ may be `%e2%80%b3` in slugs.)

## 2. Data model and copy
- New `src/lib/db/seed-data/catalog-brands.ts` exporting `glasswareSeeds`, `brandTinctureSeeds`; `catalog.ts` exports `ProductSeed`, `PoolPhoto` and builds `[...productSeeds, ...brandTinctureSeeds, ...glasswareSeeds]`.
- `ProductSeed.images?: PoolPhoto[]` (own photos, 1 image each at `/images/products/<category>/<file>`); `photo` optional; throw if both or neither.
- Category `{ slug: "glassware", name: "Glassware", description: "Borosilicate beakers, water pipes, bubblers and hand pipes, plus silicone pieces, quartz bangers and a gravity infuser." }`, id `cat_glassware`, sortOrder 7, image `/images/categories/glassware.jpg`.
- Ids `prod_<slug>`, `var_<slug>-single|<mg>`, `img_<slug>-1`.
- Inventory: glassware ≥30000→2, 10000–29999→6, 3000–9999→12, <3000→24; tinctures 20.
- createdAt 10:00Z: tinctures from 2025-12-20 every 2 days (to 2026-01-03); glassware from 2026-01-06 every 3 days (to 2026-04-06).
- Own copy: 1-sentence shortDescription + 2 paragraphs. Glassware: material, size, stated joint size, finish/colour, included parts. Tinctures: volume, total mg CBD (+CBG), spectrum, carrier/flavour, dropper. No health/effect claims.
- Banned in copy: bong, smoke, hit, toke, herb, dab, cannabis, THC, high, potency, wellness, relief, sleep. Names must not contain "pre-roll" or "accessories".

## 3. Images
- Convert each kept file one at a time: `magick <src> -limit memory 256MiB -background white -alpha remove -alpha off -resize 1100x1100 -gravity center -extent 1200x1200 -strip -interlace JPEG -quality 82 <dest>.jpg` (re-run at 75 if >250 KB).
- Read every output; reject THC/cannabis-leaf branding, shop logos, watermarks, smoke, people. A rejected image drops the product (note it here).
- Category icon `public/images/categories/glassware.jpg` 600×600 from `oil-slick-beaker.webp` with `-resize 440x440 -gravity center -extent 600x600`.
- Alt text describes the photo.
- Credits rows: File | Id = source slug | Creator = brand or "Unknown (retailer)" | License "Brand product image, used for resale; confirm permission with the brand" | Source URL = `image_url` | Notes "Padded to 1200 px square on white". Intro sentence noting the R3 exception.

### Dropped during inspection (2026-09-22)
Rejected when the converted photos were checked; their products are not seeded (originals kept in `reference-images/images/`). Result: 29 glassware + 7 brand tinctures = 36 new products (7 categories, 71 products, 70 active, 141 product images).
- `green-alien-bubbler` (source `glass-bong-green-alien-bubbler-17cm`): cannabis leaf decal on the mouthpiece.
- `moai-silicone-water-pipe` (source `silicone-bong-moai-easter-island-head-20-cm`): cannabis leaf embossed on the mouthpiece.
- `lazarus-full-spectrum-oil` (source `lazarus-naturals-cbd-tincture-full-spectrum-4fl-oz-6000mg-cbd`): hemp/cannabis leaf illustration on both the bottle label and the box. Could be reinstated if the user decides a botanical hemp-leaf drawing is acceptable (the site already uses a hemp-leaf photo in the tincture pool).
- Kept but worth a second look: `hillside-gold-beaker` has a faint etched frond (pinnate, not a cannabis leaf) on the downstem; `ice-bob-alien-water-pipe` figures closely resemble a well-known animated character (same licensing question as D3); `pure-spectrum-broad-oil` label prints "THC FREE" (a negative claim, not THC branding); `honey-water-pipe` photo includes the manufacturer's (Grace Glass) logo, allowed under R3.

## 4. Move the rest out (move, never delete)
- `mkdir -p /home/cpt/dev/main/Haven-Ways/reference-images/images`; move every root-level file of `public/images/` referenced by products.json (all, incl. originals of kept files after conversion) there; move `products.json` to `/home/cpt/dev/main/Haven-Ways/reference-images/`. Unreferenced root files → stop and ask.
- Verify `find public/images -maxdepth 1 -type f` is empty and `ls public/images` = `bands categories products promo`.

## 5. Category effects
- 7 categories (flag on) / 6 (off); bar 8 links. Rail: check 375/768; if it wraps at 768, switch rail `md:` grid classes to `lg:` in `category-rail.tsx`. Price filter max becomes $799 (data-driven). `describeStore` per D7.

## 6. Tests
- seed.test: categories 7; products derived (74); product_images derived (144); active derived (73), retitle.
- product.service.test: image loop `length >= 1`; new glassware test (count derived, specs null, distinct first images).
- category.service.test: `smokableHemp ? 7 : 6`; pre-rolls sortOrder 6.
- catalog-visibility.test: glassware enabled under both flags.
- site-config.test: D7 strings.
- New `src/lib/public-images.test.ts`: `public/images` root contains only directories.
- Copy guard: `grep -niE "\b(thc|cannabis|bong|smoke|toke|hits?|herb|dab|high|potency|wellness|relief|sleep|treat|cure)\b" src/lib/db/seed-data/catalog-brands.ts` empty.

## 7. Neon
- `pnpm db:seed --target=neon` WITHOUT `--force`. If the guard refuses (real users exist) → stop and ask the user. `--catalog-only` doesn't help (truncates users).

## 8. Deploy order
Reseed Neon → `vercel deploy` preview → user checks `/shop/glassware`, a tincture PDP, rail at 375/768/1280, bar, search "koi" → `vercel deploy --prod` only after the user's "go".

## 9. Tasks
- T1 Data and tests (catalog.ts, catalog-brands.ts, site-config.ts, tests, rail if needed). Accept: 7/6 categories; 74/73 products; tinctures pass `assertValidSpecs` + strength invariant; copy grep clean; ids per convention.
- T2 Images, move, credits. Accept: 39+1 JPGs (1200²/600²) ≤250 KB inspected; image-exists test passes; `public/images` root only 4 folders; products.json + loose files in reference-images/.
- T3 Neon reseed + preview (after tests/review/security).
