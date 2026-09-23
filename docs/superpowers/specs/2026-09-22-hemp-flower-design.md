# Spec: Hemp flower category and 8 CBD strains

User decisions (2026-09-22): separate "Hemp flower" category; 8 classic hemp strains. Same `smokableHemp` flag as pre-rolls.

## 0. Risks and open questions
- R1 Legal/processor: flower up to 28 g likely exceeds the ~Nov 2026 federal hemp cap; states ban smokable hemp; processors often decline. Flag is `true`, so it goes live on preview. Counsel sign-off needed.
- R2 CBD % and terpene notes are realistic placeholders, not COA values; replace with real batch values before launch (`strengthMg` follows CBD %).
- R3 Stock photos represent strains, not the batch; alt text stays neutral ("Dried flower buds…").
- R4 The already-deployed preview lists Hemp flower with 404 images once Neon is reseeded; deploy the new preview immediately after the reseed.
- R5 Rail at 1024 px with 8 items: keep `minmax(6rem,1fr)` and shrink the circle to `lg:size-24 xl:size-28` (do NOT use `minmax(7rem,1fr)`, it wraps).
- Q1 "Bubba Kush CBD" keeps the strain name and slug `bubba-kush-cbd-hemp-flower`; "kush" never appears in descriptions or alt.
- Q3 Production (Phase 1.5 build) reads mock data, not Neon, so the reseed does not change production.
- Q4 The user's pending production "go" now covers Phase 2 + glassware + hemp flower together.

## 1. Decisions
- D1 Category `hemp-flower` "Hemp flower", id `cat_hemp-flower`, image `/images/categories/hemp-flower.jpg`, placed right after `hemp-pre-rolls` in `categorySeeds` (pre-rolls 6, hemp-flower 7, glassware 8).
- D2 `hemp-flower-jar` stays (id, slug, SKU `HB-PRE-FLOWER`, name, price, copy unchanged). `category` → `hemp-flower`; `photo: 3` → `images: [flower-jar, flower-buds]`; both files MOVE from `products/hemp-pre-rolls/` to `products/hemp-flower/` and are removed from `photoPools["hemp-pre-rolls"]` (pre-roll pool drops to 3 photos).
- D3 Descriptions — hemp-flower: "Whole CBD hemp flower by the strain, hand trimmed and slow cured, in 3.5 g to 28 g jars. Lab tested every batch. Not available in every state." hemp-pre-rolls: "Pre-rolled CBD hemp flower in unbleached cones with card tips. Lab tested every batch. Not available in every state."
- D4 Home rows with flag on: `["hemp-flower", "tinctures", "gummies-edibles"]`; flag off unchanged.
- D5 `describeStore` flag on: "…plus smoking accessories, glassware, hemp flower and pre-rolls."; flag off unchanged. FAQ `faq-smokable-hemp` question: "Can you ship hemp flower and pre-rolls to my state?" (answer and id unchanged). Terms unchanged.
- D6 No new product featured.
- D7 Counts (derived in tests): 8 categories (flag on) / 6 (off); 79 products / 78 active; product images 148; hemp-flower 9 active; hemp-pre-rolls 3; visible active with flag off stays 66.
- D8 Rail 8 items (flag on); bar 9 links; bar may scroll at 1024, page must not overflow.

## 2. Strains (`src/lib/db/seed-data/catalog-flower.ts`, exports `hempFlowerSeeds: ProductSeed[]`, row→seed map like catalog-brands.ts)
Common: `category: "hemp-flower"`; `images: [{ file: "<slug>.jpg", alt }]`; `specs: { strengthMg, spectrum: "full", labTested: true, servingSize: "as needed", ingredients: ["hemp flower"] }`, `strengthMg = 3500 × CBD% / 100`; variants in order `{key:"3-5g",name:"3.5 g"}`, `{key:"7g",name:"7 g"}`, `{key:"14g",name:"14 g"}`, `{key:"28g",name:"28 g"}` (legend "Size"); inventory 24; createdAt `seedDate("2026-04-03", index*3)` (export `seedDate` from catalog-brands.ts); ids `prod_<slug>`, `var_<slug>-<key>`, `img_<slug>-1`. Keep `cbdPercent` in the row type.

| # | slug | name | SKU | CBD % | strengthMg | 3.5 g | 7 g | 14 g | 28 g | photo (tentative) |
|---|---|---|---|---|---|---|---|---|---|---|
|1|lifter-hemp-flower|Lifter hemp flower|HB-FLW-LIFTER|16|560|2500|4500|8000|13500|2rW8lq0NgPU|
|2|special-sauce-hemp-flower|Special Sauce hemp flower|HB-FLW-SAUCE|17|595|2700|4800|8500|14500|N9w237MCZxU|
|3|suver-haze-hemp-flower|Suver Haze hemp flower|HB-FLW-SUVER|18|630|2800|5000|9000|15000|sONiTSxfHoo|
|4|hawaiian-haze-hemp-flower|Hawaiian Haze hemp flower|HB-FLW-HAWAIIAN|15|525|2400|4400|7800|13000|WBSHDHmqmBk|
|5|elektra-hemp-flower|Elektra hemp flower|HB-FLW-ELEKTRA|16|560|2500|4500|8000|13500|9kEFsEVKyjI|
|6|cherry-wine-hemp-flower|Cherry Wine hemp flower|HB-FLW-CHERRY|15|525|2400|4400|7800|13000|hJ7qV7TrDgc (purple)|
|7|sour-space-candy-hemp-flower|Sour Space Candy hemp flower|HB-FLW-SOURSPACE|17|595|2600|4700|8400|14000|g9GJ2tWMsEE|
|8|bubba-kush-cbd-hemp-flower|Bubba Kush CBD hemp flower|HB-FLW-BUBBA|14|490|2200|4000|7200|12000|7-VhhCfFtzk|

Copy (own, sentence case; strain names capitalised):
- shortDescription: one sentence passing `/^[^.]+(\.\d[^.]*)*\.$/`, e.g. "Hand-trimmed Lifter CBD hemp flower with a sharp cheese and citrus aroma, in 3.5 g to 28 g jars."
- description: 2 paragraphs — (1) aroma, terpene notes, bud structure/colour; (2) trim, slow dry and 3–4 week cure in glass, grown on licensed Oregon farms, "about N% CBD, roughly M mg per 3.5 g" per the lab report, batch number on the lid, glass jar with a two-way humidity pack.
- Sensory seeds: Lifter — sharp cheese and fuel, citrus edge; myrcene, beta-caryophyllene; dense medium lime-green buds. Special Sauce — dark berry and earth; myrcene, beta-caryophyllene, limonene; deep green with purple flecks. Suver Haze — sweet fruit and pine; myrcene, pinene; long tapered spears. Hawaiian Haze — pineapple and citrus peel; terpinolene, limonene; airy fox-tailed buds. Elektra — sweet pine and damp earth; beta-caryophyllene, myrcene; chunky tight buds. Cherry Wine — dark cherry and cracked pepper; myrcene, beta-caryophyllene; purple-tinged calyxes. Sour Space Candy — sour apple and hard candy; myrcene, pinene; frosty pale green. Bubba Kush CBD — cocoa, coffee and earth; beta-caryophyllene, limonene; compact dark green with purple.
- Banned in copy, alt and comments: THC, cannabis, marijuana, weed, kush (Bubba name/slug only exceptions), smoke/smoking, toke, hit, herb, dab, hash, high, potency, wellness, relief, sleep, treat, bare "cure" (use "cured"/"curing"), buzz, stoned, relax, calm, euphoric, uplift, energising, sativa, indica, psychoactive, intoxicating. No effect/health claims, no THC figures.
- Alt text starts "Dried flower buds…" and describes the photo.

## 3. Code changes
- `src/lib/catalog-visibility.ts`: `HEMP_PRE_ROLLS_CATEGORY = "hemp-pre-rolls"`, `HEMP_FLOWER_CATEGORY = "hemp-flower"`, `SMOKABLE_HEMP_CATEGORIES: ReadonlySet<string>`; `isCategoryEnabled(slug, features) = !SMOKABLE_HEMP_CATEGORIES.has(slug) || features.smokableHemp`; new `hiddenCategorySlugs(features): readonly string[]` ([] when on, both slugs when off). Remove `SMOKABLE_HEMP_CATEGORY` and update imports (catalog.ts, product.queries.ts, category/product service tests, catalog-visibility test). Update JSDoc and the `FeatureFlags.smokableHemp` comment.
- `src/services/product.queries.ts` `visibleCategory`: `undefined` when nothing hidden, else `notInArray(categories.slug, [...hidden])`.
- `catalog.ts`: category row (D1/D3), hemp-flower-jar change (D2), trim pre-roll pool, `allProductSeeds = [...productSeeds, ...brandTinctureSeeds, ...glasswareSeeds, ...hempFlowerSeeds]`, update the "7 categories" comment.
- `src/content/site-content.ts`: FAQ question (D5), flag-on rows (D4). `src/lib/site-config.ts`: flag-on `describeStore`.
- `src/components/catalog/category-rail.tsx`: keep `lg:grid-cols-[repeat(auto-fit,minmax(6rem,1fr))]`; circle `lg:size-24 xl:size-28`; keep `sizes="112px"`. No bar change.

## 4. Tests
- catalog-visibility: both slugs hidden off / shown on; tinctures, accessories, glassware always enabled; `hiddenCategorySlugs`.
- category.service: `smokableHemp ? 8 : 6`; glassware sortOrder 8 last; pre-rolls count 3 sortOrder 6; hemp-flower count 9 sortOrder 7 (on), null (off).
- product.service: enabled-categories test loops over `SMOKABLE_HEMP_CATEGORIES`; `hemp-flower-jar` category `hemp-flower` (on) / null (off); search "lifter" and `searchSuggestions("hemp flower")` results on / none off; new strains test (slugs = `expected.activeIn("hemp-flower")`, one image each at `/images/products/hemp-flower/<slug>.jpg`, variant names, spectrum "full", servingSize "as needed", distinct first images).
- catalog-brands.test: 8-slug category list, glassware sortOrder 8, retitle "…last".
- New catalog-flower.test (node): SKU `/^HB-FLW-[A-Z]+$/`; 4 variants ascending prices; `strengthMg === 3500 × cbdPercent / 100`; dates every 3 days from 2026-04-03; inventory 24; alt starts "Dried flower buds"; shortDescription regex; 2 paragraphs; copy guard over shortDescription, description, alt (all) and name (all but Bubba).
- seed.test: `categories: 8`, contains `cat_hemp-flower`.
- site-config.test: flag-on string; flag-off output has no "flower".
- content.service.test: flag-on rows; flag-off text has no "hemp flower" / "hemp-flower" (exact phrase; band alt contains "wildflowers").
- variant-legend: `["3.5 g","7 g","14 g","28 g"]` with specs → "Size".

## 5. Tasks
### T1 Photos and credits (first)
Files: `public/images/products/hemp-flower/*.jpg` (8 new + 2 moved), `public/images/categories/hemp-flower.jpg`, `docs/image-credits.md`.
Per ID, one at a time: download `curl -sL -A "Mozilla/5.0" -o <scratchpad>/raw/<id>.jpg "https://unsplash.com/photos/<id>/download?force=true&w=2000"` (photographer from `dl=`); Read the raw file and reject smoke, ash, lit joints, people/faces/hands at the mouth, bongs/pipes/vapes, text/labels/watermarks, 420/THC/dispensary branding, neon signs, near-duplicates of flower-buds/flower-jar; convert `magick raw -limit memory 256MiB -auto-orient -strip -resize 1200x1200^ -gravity center -extent 1200x1200 -quality 78 -sampling-factor 4:2:0 -interlace JPEG out.jpg` (70 if >250 KB); Read the output.
Photo choice: tentative first; else first passing reserve in order 0PAmztD6HGQ, Ld9FQlMez8g, CLNXwIhjxnw, ryd5gy3EqsA, oYgXPGZui98, QAEkPZZ2P5I, NTjYIb6lxoc, sEAP7klTxsk, wv2kS8wsf1E, Wl_Xv2MRRZw, 4374FcrtNmM. Be sceptical of PKN1coObyLA, oJJkFGn-AP4, rdr3AprDMxY, xPrkT86duDw (labels). Never use zwc6BD4_RDE, X29BDflJyxM, muuZhItgQoE, Et2GCPYzze4, J6Yj7p6U6Ic, xcNIksQdLfs. If hJ7qV7TrDgc fails, Cherry Wine takes the purplest passing photo. Fewer than 8 pass → drop strains and list them under "Dropped during inspection" here.
Category icon: 600×600 from TEsYP38pf0o (fallback HOQ5pZdmFQI), not a product photo.
Credits: one row per file (File | Unsplash id | photographer | Unsplash License | `https://unsplash.com/photos/<id>` | neutral description + crop); update the two moved rows' paths; extend the intro.
Accept: 8 × 1200² + 1 × 600², each ≤250 KB and inspected; the two files moved (pre-roll folder keeps 3); `public-images.test.ts` passes; slug → id → alt mapping handed to T2.

### T2 Data, flag, content, rail, tests
Files per §3–4. Accept: 8/6 categories; 79/78 products; `assertValidSpecs` passes; flag off hides both categories everywhere (bar, rail, search, featured, related) and both `/shop/hemp-pre-rolls` and `/shop/hemp-flower` 404; flag on: strain PDP shows "Size" legend with 4 options and Strength = strengthMg; home first row is Hemp flower; rail one row without overlap at 1024/1280, scrolls at 375/768; no page overflow at 375/768/1024/1280; copy guard clean.
Verify: `pnpm typecheck && pnpm lint && pnpm format:check`; tests in subsets with `TEST_DATABASE_URL` on Docker; copy-guard grep on catalog-flower.ts matches only the Bubba slug/name lines; temporary flag-off run then revert.

### Release (after test, review, security)
`pnpm db:seed --target=neon` without `--force` (stop and ask if it refuses) → `vercel deploy` preview immediately → user checks `/shop/hemp-flower` (9), a strain PDP, `/product/hemp-flower-jar`, home first row, rail at 375/768/1024/1280, bar, search "cherry" → `vercel deploy --prod` only after the user's "go".

Nice-to-have (not now): per-variant inventory, "photo is representative" note, 28 g compare-at, flower reviews seed, "House hemp flower jar" rename.
