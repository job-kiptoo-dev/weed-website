# Spec: bulk catalog import (606 → 565 products)

Source: `/home/cpt/dev/main/Haven-Ways/reference-images/products.json` (606) + `reference-images/images/` (599 files). User decision: import everything, prices and descriptions from the JSON, marijuana categories shipped OFF behind a new flag.

## 0. Risks (once)
- R1 All 565 photos are manufacturer/retailer shots scraped from greencannabisdeliverystore.com; permission unconfirmed. Same deliberate exception as the glassware spec (R3/R4). Blocking for launch, not preview.
- R2 The 4 Rick and Morty pieces + "The Child" beaker are imported into visible `glassware` on the user's "all" decision; unlicensed character art is a trademark exposure. Tag them `characterArt` in the manifest so one denylist line removes them.
- R3 Every marijuana category ships behind `features.licensedCannabis = false`: nothing marijuana is listed, prerendered, searchable or linkable until the licence is confirmed. Flip gated on §9.
- Secondary: cartridges/vaporizers are PACT Act mail-order restricted (hence Puffco → restricted `vaporizers`); FDA/FTC claims handled by the claim stripper (§3); the ~Nov 2026 hemp cap still applies to visible delta-8/10 items.

## Dependencies
Hemp flower work (catalog-flower.ts, `SMOKABLE_HEMP_CATEGORIES`/`hiddenCategorySlugs`) lands first; widen it, don't restructure. `magick` on PATH; Docker for DB tests.

## Decisions kept from earlier review (denylist, 5 of 606)
`glasscity-beaker-ice-bong-10-inch-greyish` (competitor logo), `glass-bong-green-alien-bubbler-17cm` and `silicone-bong-moai-easter-island-head-20-cm` (cannabis leaf on mouthpiece), `lazarus-naturals-cbd-tincture-full-spectrum-4fl-oz-6000mg-cbd` (leaf on label), `hand-pipe-4%e2%80%b3-spiral-2` (duplicate).
Delta-8/10/HHC: edibles and tinctures → visible categories; cartridges, vapes, concentrates → restricted regardless of cannabinoid.

## 1. Categories (append only; sortOrder = index+1, 1–8 unchanged)
9 `cannabis-flower` "Cannabis flower", 10 `cannabis-pre-rolls` "Cannabis pre-rolls", 11 `vape-cartridges` "Vape cartridges", 12 `vaporizers` "Vaporizers", 13 `concentrates` "Concentrates", 14 `cannabis-edibles` "Cannabis edibles", 15 `cannabis-tinctures` "Cannabis tinctures" — all gated by `licensedCannabis`. Descriptions per the planner's table (each ends "Sold only where the licence allows, to adults 21 and over."; vape/vaporizer note "Not shipped by mail").

Routing (first match wins, rule id logged):
1. already imported → skip; 2. denylist → skip with reason; 3. `Bongs` → visible `glassware`, except the 7 `puffco-*` → restricted `vaporizers`; 4. `CBD` → THC test over name+description+short_description (`/\bthc\b/i`, `/\d+\s*mg\s*thc/i`, `/\d+\s*:\s*\d+\b/`, `/crafted for medical|recreational/i`) → hit = `cannabis-tinctures` (~35), no hit = visible `tinctures` (~6, no new `cbd` category); 5. `Edibles` → `cannabis-edibles` unless `/delta[-\s]?(8|10)|\bhhc\b|thc-?o/i` → visible `gummies-edibles`; 6. Flowers→`cannabis-flower`, Pre-Rolls→`cannabis-pre-rolls`, Cartridges→`vape-cartridges`, Vaporizer→`vaporizers`, Concentrates→`concentrates`.

Counts: 606 − 36 imported − 5 denylist = **565 new**; after: 15 categories, 645 products (644 active). Visible with default flags: 9 categories, ~105 products. New tiles required: `public/images/categories/<slug>.jpg` ×7 (600²) or the rail breaks when the flag flips.

## 2. Flag
`FeatureFlags.licensedCannabis: boolean` (default false, documented). `catalog-visibility.ts`: `CATEGORY_FLAGS: Readonly<Record<string, keyof FeatureFlags>>` with the two smokable-hemp keys FIRST (a test asserts hidden order); derive `SMOKABLE_HEMP_CATEGORIES`, `LICENSED_CANNABIS_CATEGORIES`, `isCategoryEnabled`, `hiddenCategorySlugs` from it. `visibleCategory` unchanged (single SQL choke point). `describeStore` untouched while the flag is off. Type ripple: add `licensedCannabis` to ~14 test flag literals.

## 3. Mapping (JSON → ProductSeed; `description` is a 2-tuple)
- slug: decode `%e2%80%b3`; `″` after a digit → `in`; lowercase; `[^a-z0-9]+`→`-`; dedupe with `-2`, `-3`; assert `/^[a-z0-9]+(-[a-z0-9]+)*$/`.
- name: trimmed; ALL-CAPS → sentence case with keep-caps allowlist (CBD THC HHC AM PM XL OG GG4 STIIIZY PUFFCO, roman numerals, tokens with digits); `″`→" in"; straighten quotes/dashes; drop trailing `| <Brand>` only when it equals `source.brand`; cap 120 chars.
- price: if `sale_price` > 0 → price = sale, compareAt = regular when greater, else null; otherwise first `\$\s*([\d,]+(?:\.\d{2})?)` in `price`. `Math.round(parseFloat(...)*100)`. Skip non-finite or ≤ 0. DB check requires compareAt strictly greater.
- description → [p1, p2]: p1 from `description` → `short_description` → generated factual sentence; strip leading "Description", collapse the scrape's repeated opening clause, straighten punctuation, `|`→". ", end with ".", cap 700 chars on a sentence boundary. **Claim stripper** (sentence-level, also over short description and name): drop sentences matching relief|relieve|treats?|cures?|heal|remedy|prevents?|diagnos|therapeutic|medicinal|medical|doctor formulated|clinically|support (normal|healthy|joint|brain|immune)|brain function|joint mobility|anti-?inflammat|pain|anxiety|depress|insomnia|sleep aid|dosage|dose (per|of)|servings? per day|take \d|mg per (day|dose)|benefits?|wellness|boosts?|detox|immunity|FDA. If everything is dropped, use the generated sentence. Log every dropped sentence to `docs/import-report.md` as `slug | rule | dropped text`. p2 generated per destination category with a parsed size clause; no effect or health wording.
- shortDescription: `short_description` → first sentence of p1 → generated; claim-stripped; one sentence; ≤110 chars; matches `/^[^.]+(\.\d[^.]*)*\.$/`.
- sku `HB-<CAT3>-<NNNN>` (CFL, CPR, CRT, VAP, CON, CED, CTI, GLS, TIN, GUM), 4-digit counter per category in source order, recorded in the manifest.
- variants: one `{ key: "single", name: "One size", priceCents }`. specs: null. featured: false. status: active.
- inventory: ≥$300→2, ≥$100→6, ≥$30→12, else 24.
- createdAt: base `2024-06-03T10:00:00.000Z`, +6 h per product in emission order (ends ~2024-10), so house/brand/glassware/flower keep sorting first.
- images: one own photo `images: [{ file: "<slug>.jpg", alt }]`. Alt: hand-written for the ~26 visible products; generated `"<name>, product photo on a white background"` for restricted.
- Dedupe on the raw source slug. Commit `src/lib/db/seed-data/import/manifest.json` (imported + skipped with reasons) and `import/already-imported.json` (the 36 source slugs from the glassware spec tables + the 5 denylisted). Re-running must be byte-identical (`git diff --exit-code`).

## 4. Images
599 files (492 webp, 77 jpg/jpeg, 37 png) vs 606 entries → ≥7 missing/repeated: missing or already-consumed file → skip the product (`missing-image`/`duplicate-image` in the manifest). Scripted loop at concurrency 2: `magick <src> -limit memory 256MiB -background white -alpha remove -alpha off -resize 1100x1100 -gravity center -extent 1200x1200 -strip -interlace JPEG -quality 82 <dest>.jpg`, retry at 75 then 70 while > **200 KB**. Move originals to `reference-images/images/used/`. Budget ~74 MB new static images; Vercel file-count and per-file limits are fine; watch upload time and Image Optimization quota once the flag flips; lever = `.vercelignore` the restricted folders (do not do it pre-emptively).
**Inspection sampling:** inspect every image landing in a visible category (~26), all 7 tiles, every output still >200 KB at q70 or with aspect ratio worse than 2.5:1 or a transparent PNG source, plus 20 deterministic samples (every 28th) from the restricted set. **The remaining ~500 restricted images are NOT individually reviewed** — say so in the spec, the report and the credits intro; a full review is a precondition of flipping the flag.
Credits: generated `docs/image-credits-import.md` (File | source slug | creator = `source.brand` or "Unknown (retailer)" | "Retailer product image, used for resale; permission unconfirmed" | `image_url` | notes incl. "not individually reviewed"), plus one cross-reference line in `docs/image-credits.md`.

## 5. Seed shape
`src/lib/db/seed-data/import/transform.ts` (pure, unit-tested) + `scripts/import-catalog.ts` (I/O only, `pnpm import:catalog`) → committed `src/lib/db/seed-data/catalog-import.generated.ts` exporting `importedSeeds: ProductSeed[]` (~7k lines) with a do-not-edit header; `buildSeedCatalog` appends it. **Do not commit the source JSON** (public repo; verbatim competitor copy incl. the claims we strip). Prettier the generated file once per regeneration.

## 6. Tests
seed.test categories 8→15. catalog-visibility: each new slug false/true by flag under both hemp values; `hiddenCategorySlugs` 7 default / 9 with hemp off / [] both on, hemp pair first; `SMOKABLE_HEMP_CATEGORIES.size === 2`; every `CATEGORY_FLAGS` key is a real category and maps to a real flag. site-config: `licensedCannabis === false` guard; `describeStore` unaffected by it. Service tests: add the flag literal; re-check the "gum" suggestion and SKU tests.
New `catalog-import.test.ts`: category membership; every restricted category non-empty; none featured; all active; specs null; slug and SKU shapes; global uniqueness; single "One size" variant; price > 0 and compareAt null-or-greater; shortDescription regex and ≤110; exactly 2 paragraphs; **claim guard** over all imported copy; **substance guard scoped to visible categories** with an explicit `KNOWN_VISIBLE_THC_NAMES` allowlist for the delta-8/10 items; every product image and every category tile exists on disk; manifest integrity (imported + skipped = 606, unique, no overlap with already-imported).
New `import/transform.test.ts` (unit): price forms, slug decoding, duplicate suffixing, name tidy, claim stripping (drops "Support normal brain function", keeps "Comes in packs of 10 gummies, and 20mg each"), repeated-clause collapse, shortDescription truncation, SKU stability, routing cases incl. delta-10 gummy → visible and delta-10 cartridge → restricted.
Copy-guard scoping: the strict hemp grep stays file-scoped to `catalog.ts`, `catalog-brands.ts`, `catalog-flower.ts` (the import file legitimately names THC/cannabis); add a claim grep over the generated file.

## 7. Performance
Visible: ~105 products, 6 pages. Flag on: 645 → 33 pages; single indexed select + count. Price range facet: max stays ~$300 while off, $420 when on. Search: sequential over 645 rows, microseconds; suggestion ranking may shift. `/shop/[category]` prerenders visible categories only; PDPs have no `generateStaticParams`. Seeding: +565 rows per table; bound params ≈ 9,000 of 65,535 (chunk at 1,000 rows past ~4,000 products); +150–400 ms PGlite, +1–2 s Neon; record the measured number in the report. Keep `experimental.cpus: 2`; DB tests on Docker.

## 8. Tasks
- **T1** flag + visibility map + 7 categories + 7 tiles. Accept: 15 seed categories, 9 visible by default, `hiddenCategorySlugs` 7 in map order, `/shop/cannabis-flower` 404, no cannabis slug in bar/rail/search/`generateStaticParams`, every tile on disk, existing tests pass with literal/count edits only.
- **T2** transform lib + generator + generated seeds + manifest + report. Accept: 565 seeds, 41 skips accounted for, per-category counts match §1, claim guard and greps clean, slugs/SKUs unique, re-run byte-identical, `assertValidSpecs` passes.
- **T3** images: convert, move to `used/`, credits, sampled inspection. Accept: one jpg per imported product + 7 tiles, all 1200² (tiles 600²), none >200 KB, `public/images` root has only the 4 folders, image-existence test covers all 645 products and 15 categories, report names the un-reviewed ~500.
- **T4** Neon reseed, preview, production after "go" (§9).

Out of MVP: size variants from names, specs for restricted products, hand-written copy/alt for restricted, reviews, the 3 leaf-rejected + 1 logo item, a "Cannabis" nav grouping and FAQ/terms for the flag-on world, Vercel Blob, a `cbd` category.

## 9. Release
1. T1–T3 green (typecheck, lint, format, unit, db file-by-file on Docker, both greps), no blocking review issues.
2. `pnpm db:seed --target=neon` without `--force`; if the guard refuses, stop and ask the user.
3. `vercel deploy` preview; user checks `/shop` (page count, price slider, nothing marijuana), `/shop/glassware` (5 new), a delta-8 gummy PDP, a CBD tincture PDP, search "delta" and "flower", the rail at 375/768/1024/1280, and `/shop/cannabis-flower` 404.
4. `vercel deploy --prod` only after the user's explicit "go".
5. **Flip checklist for `licensedCannabis`** (do not act on it): licence confirmed in writing; full review of the ~500 un-reviewed photos; real alt text; FAQ + terms sections; `describeStore` third branch; per-state shipping and a carrier decision for cartridges/vaporizers (PACT Act); payment processor sign-off; rail re-check at 15 tiles; deploy size re-measured.
