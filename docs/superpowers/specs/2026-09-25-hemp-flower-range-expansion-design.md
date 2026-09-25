# Spec: Hemp flower range expansion — 15 more strains and two more jar sizes

Request (client, 2026-09-25, verbatim): "lets add more hemp strains and the size variants too". Scope: the `hemp-flower` category only. Pre-rolls, glassware, tinctures, gummies, topicals, teas and accessories are untouched. Seed data plus 15 new image files — no schema change, no migration.

Result: 8 → 23 strains (24 hemp-flower products with `hemp-flower-jar`); the jar ladder grows from 4 sizes to 5 (3.5 / 7 / 14 / 28 / 56 g); every jar price and every `strengthMg` becomes derived instead of hand-typed.

Revision history: first approved 2026-09-25 with 10 new strains on shared photos. Amended the same day after the client supplied `public/images/newImages/` (599 scraped dispensary photos), which lifted the photo constraint: 15 new strains, one distinct photo each.

## 0. Risks, dependencies and open questions

- **R1 Legal, inherited and worsened.** `2026-09-22-hemp-flower-design.md` R1 already flags that flower up to 28 g likely exceeds the ~Nov 2026 federal total-THC cap, that some states ban smokable hemp, and that processors often decline it. A 56 g jar deepens that exposure; it does not create a new class of problem. `features.smokableHemp` is `true`, so this ships to preview on merge. Counsel sign-off still outstanding. 112 g (§9) is explicitly held back behind counsel.
- **R2 Placeholder lab values.** CBD percentages and terpene notes are realistic placeholders "in the shape of a lab report", stated as such in the file header of `src/lib/db/seed-data/catalog-flower.ts:1-9`. Keep that disclosure. **Every `cbdPercent` and every terpene note must be replaced with real batch values before launch**, and `specs.strengthMg` plus the "about N% CBD, roughly M mg per 3.5 g" clause follow automatically once the derivation in §3 lands.
- **R3 (NEW, and the serious one) The 15 imported photos are someone else's copyrighted photography of a product we do not sell.** They are a California THC dispensary's studio shots, scraped. Two distinct problems, both accepted by the user knowingly and twice, both recorded here so nobody can claim they were not told:
  1. **Copyright.** No licence has been granted. They go in under the same documented exception the glassware and brand tinctures already use (`docs/image-credits.md` paragraph 2: "manufacturer or retailer product shots … Permission has to be confirmed with each brand, or the photo replaced, before launch"), but that exception was written for photos of *the exact item being resold*, which at least carries an implied commercial purpose. Here it does not apply on those terms: we are not reselling these products. The exposure is straightforward infringement until permission exists or the photos are replaced.
  2. **Misrepresentation, which is the bigger commercial risk.** Every one of these images depicts marijuana of unverified and probably high THC content — several are visibly dense, dark-purple, heavily trichome-covered indoor flower (see the appearance notes in §2.3). We would be using them to illustrate low-THC CBD hemp cultivars. A customer receiving ordinary CBD hemp flower after seeing these photos has a reasonable "not as described" complaint, and on a product whose entire legal basis is being *not* THC-bearing, a photo that looks like high-THC marijuana is evidence against us in exactly the wrong forum. The product copy must never claim the photo shows the batch, `docs/image-credits.md` must say plainly what these are (§5), and **they must be replaced with the client's own photography before launch**. This is a launch blocker, not a nice-to-have.
- **R4 `docs/image-credits.md` must not be allowed to lie.** Line 3 currently says the eight strain photos in `products/hemp-flower/` were each vetted and stand for the strain. That stays true for those eight. The 15 new rows are a different licence class and a different subject, and the doc must say so in those words — not "hemp", not "dried flower", but cannabis of unverified THC content used to illustrate a hemp cultivar. Exact text in §5.
- **R5 Stale local carts re-price.** 11 existing non-default prices change (§3.4). Carts and wishlists live in localStorage keyed by variant id; ids are unchanged and no id is removed, so nothing breaks, but a cart holding e.g. 14 g Bubba at $72 re-prices to $70 at checkout. `orderService.priceOrder` already re-prices every line from the database (`src/services/order.service.ts:276-343`), so the customer sees the new number before paying. No action needed; do not "fix" it by freezing prices.
- **R6 Reseeding is destructive.** `seedDatabase` calls `truncateAll` on every app and auth table inside one transaction (`src/lib/db/seed/insert.ts:355-383`, `:55-60`) — users, orders, reviews, wishlists, discount codes, all of it. Seed data changes only reach Neon by re-seeding; there is no incremental path. Run `pnpm db:seed --target=neon` **without** `--force`. `assertSeedAllowed` (`src/lib/db/seed/guard.ts:34-52`) refuses if the target holds users outside the seed domains, i.e. real customers. **If it refuses, stop and ask the user — do not pass `--force`.** `--catalog-only` does not help (it still truncates everything).
- **R7 (RECOUNTED, and now tight) Product-count headroom is nearly gone.** `MAX_PAGE_SIZE = 100` (`src/services/product.service.ts:48`) and several tests assert `listProducts({ pageSize: 100 }).items` has length `activeCount` (`src/services/product.service.test.ts:84-87`, `:562`). Active products go **78 → 93**. That leaves **7**. The next catalog addition of any size breaks those assertions and needs a pagination refactor of the test helpers first — do not discover this mid-feature. If the client asks for more strains after this, that refactor is task one.
- **R8 (NEW) The working tree currently fails the test suite.** `src/lib/public-images.test.ts:15-21` asserts that `public/images` contains exactly `["bands","categories","payments","products","promo"]`. `public/images/newImages/` is a sixth entry, so **`pnpm test` is red before any work starts**. T2 resolves it by moving the folder out of the tree. Do not "fix" it by editing the test to allow `newImages` — that test exists precisely to stop unreviewed image dumps reaching the public site.
- **R9 (NEW) Two of the 23 candidate files are the same photograph.** `star-killer-og.jpg` and `bruce-banner-3.jpg` are identical (same bud, same angle, same shadow). Using both would put the same image on two products and break the 1:1 rule in D4. `bruce-banner-3.jpg` is used; `star-killer-og.jpg` is blacklisted in §2.3. Distinct usable images: **22**, of which 15 are used and **7** are spare.
- **R10 Anything under `public/` is published.** Next.js serves `public/` verbatim, and `.vercelignore:1` records that `vercel deploy` uploads the working tree because the project is not git-connected. So `public/images/newImages/` would be served at `/images/newImages/<file>` on the live domain — 599 files, ~51 MB, mostly California THC packaging carrying "CANNABIS" wording and the state warning triangle, on a hemp storefront. **`.gitignore` does not prevent this**; only removing it from the working tree (or a `.vercelignore` entry) does. See §5 for the disposition.
- **D1 (dependency) Nothing outside `hemp-flower` changes in code.** `catalog.ts` needs exactly one edit (the category description, §5) — `allProductSeeds` already spreads `hempFlowerSeeds` (`src/lib/db/seed-data/catalog.ts:1600-1605`), `photoPools` is not touched, `categorySeeds` is not touched, `catalog-visibility.ts` is not touched, `site-content.ts` and `site-config.ts` are not touched.
- **D2 (dependency) No framework surface is touched.** No new route, component, server action, cache directive or `next/*` import. Per `AGENTS.md` this is Next.js 16 with breaking changes, but nothing here is framework-shaped, so no guide in `node_modules/next/dist/docs/` is in play. If that stops being true, read the relevant guide first.
- **D3 (dependency) The uncommitted working tree.** `git status` shows 18 modified files from the checkout/Stripe work, none in this blast radius except `src/services/order.service.ts` / `order.service.test.ts` (which reference `prod_lifter-hemp-flower` only through derived seed lookups). Do not bundle those into this commit. The 84 product/category photos deleted in error have been restored from git; all 10 files in `public/images/products/hemp-flower/` are present and verified.
- **D4 One photo, one strain.** No image is the primary of two products. Asserted by test (§6). This is what the photo import buys, and it is worth keeping.
- **Q1** The 15 photos show high-THC marijuana (R3.2). Does the client want to proceed to *preview* on that basis, or hold the new strains until their own photography exists? The user has said yes twice; this asks once more in writing because it is the one decision here that can reach a customer as a misdescription.
- **Q2** Ship 56 g only, or also 112 g? Default: 56 g only, 112 g behind counsel.
- **Q3** Three of the 23 names start with "Cherry" (Cherry Wine, Cherry Blossom, Cherry Cobbler). Acceptable, or swap Cherry Cobbler for a reserve name?
- **Q4** "Otto II" or "Otto 2"? Slug would become `otto-2-hemp-flower`. The key is `OTTO` either way — the SKU test is `/^HB-FLW-[A-Z]+$/`, no digits.
- **Q5** "Ringo's Gift" and "The Wife" are genuine cultivar names that read oddly as product names. Keep the real names (my recommendation, and consistent with the honesty argument in §2.2) or substitute reserves?
- **Q6** Does the pending production "go" cover this expansion, or is a fresh approval needed after the preview?

## 1. Current state (verified 2026-09-25)

- `src/lib/db/seed-data/catalog-flower.ts` — 8 `FlowerRow`s mapped to `hempFlowerSeeds: ProductSeed[]` (`:158-176`). Row fields: `slug, name, key, cbdPercent, prices: [number,number,number,number], alt, shortDescription, description: [string,string]` (`:18-30`).
- `flowerVariants()` (`:148-156`) builds 4 variants, smallest first: `3-5g` / `7g` / `14g` / `28g`.
- `BASE_GRAMS = 3.5` (`:14`); `specs.strengthMg = (BASE_GRAMS * 1000 * row.cbdPercent) / 100` (`:168`).
- `FLOWER_INVENTORY = 24` (`:16`), applied at product level only; every variant inherits it (`catalog.ts:1218`).
- `createdAt: seedDate("2026-04-03", index * 3)` (`:175`); `seedDate` from `catalog-brands.ts:14-18`. Existing dates run 2026-04-03 (Lifter) → 2026-04-24 (Bubba), the newest products in the catalog.
- Each strain has its own photo: `images: [{ file: \`${row.slug}.jpg\`, alt: row.alt }]` (`:163`). Ten files in `public/images/products/hemp-flower/`: the 8 strain photos plus `flower-buds.jpg` and `flower-jar.jpg`. All present and restored.
- The 9th flower product, `hemp-flower-jar`, lives in `catalog.ts:1103-1136` with 2 variants (3.5 g / 7 g) and `images: [flower-jar, flower-buds]`. `/shop/hemp-flower` therefore shows 9.
- **The invariant.** `catalog.ts:1220` sets `isDefault: index === 0`; `catalog.ts:282` records that `specs.strengthMg` must equal the default (first) variant's strength. `catalog.ts:1217` gives the default variant `priceCents: null`, so `products.priceCents` (the number on the card, `product-card.tsx:82-86`) is the first variant's price.
- `SpecSheet` is a server component that renders `specs.strengthMg` statically (`src/components/catalog/spec-sheet.tsx:29`); it does **not** react to variant selection. Whatever the default variant is, "Strength" describes that size.
- House image standard: product squares are **1200×1200 sRGB**, ~50–240 KB, metadata stripped. Verified on all 10 hemp-flower files and the glassware set.
- New in the working tree: `data/products.json` (608 KB; byte-differs from `reference-images/products.json` but the same 606 products, identical slug set and keys; **no source file imports it** — the only references anywhere are `.vercelignore:3`, `README.md:132` and three specs) and `public/images/newImages/` (599 files, ~51 MB).
- Counts today (all derived in tests): 8 categories, 79 products / 78 active, 148 product images, hemp-flower 9 active, hemp-pre-rolls 3.

## 2. Decisions: what gets added and why

### 2.1 Photos

The constraint that shaped the first draft is gone. `public/images/newImages/` contains 107 flower-category photos, of which **23 are clean bud-only studio shots on white** — no packaging, no labels, no branding, no people, no smoke, no lit material — at 600×600 sRGB, ~40–70 KB. All 23 were opened and inspected individually for this spec (not sampled); notes in §2.3. Two are the same photograph (R9), so **22 are usable**.

The other 84 flower photos are unusable and must not be touched: 7 are branded jar/tin/bag/card shots (`alien-og-eighth-caliva`, `banana-macaroon`, `black-cherry-pie`, `cake-mix-indoor`, `gary-payton-indoor`, `georgia-pie-indoor`, `super-sour-diesel`), and the remaining 77 `.webp`/`.png`/`.jpeg` files are brand packaging — Allswell, Almora, Stiiizy, Old Pal, Pure Beauty, West Coast Cure, Ember Valley, Source, Rythm, Alien Labs, Cookies — most showing "CANNABIS" wording and the California THC warning triangle.

**D5 — 23 strains, one distinct photo each. No sharing anywhere.** The 8 existing strains keep their current Unsplash photos byte-for-byte unchanged. The 15 new strains take 15 of the 22 usable dispensary photos, converted to house standard. 7 remain spare for future strains, in `reference-images/newImages/` (not in the repo).

**D6 — the photo table stays, with a 1:1 mapping.**

```
FLOWER_PHOTOS: a frozen Record<filename, altText> for the 25 files in
public/images/products/hemp-flower/.  FlowerPhoto = keyof typeof FLOWER_PHOTOS.
FlowerRow loses `alt` and gains `photo: FlowerPhoto`.
The seed map emits images: [{ file: row.photo, alt: FLOWER_PHOTOS[row.photo] }].
```

The table is still the right shape even without sharing: the alt text belongs to the photograph, not to the strain, so it lives beside the filename and cannot drift from it; a typo is a type error rather than a broken image found in review; and a test can compare the table's keys against the directory listing, so an orphaned or missing file fails the build (§6). Each new strain's `photo` is its own `<slug>.jpg`, so the mapping reads as identity — that is fine and is the point.

**D7 — the imported photos go in under the existing documented exception**, extended in `docs/image-credits.md` to name this category and state plainly what the images depict (§5). Addendum A photo rule 6 (`2026-09-21-phase1.5-redesign-design.md:39`) bans cannabis leaves, THC branding, other shops' logos, smoke and people; the 23 carry none of those. Six of them (`alien-og`, `la-confidential`, `platinum-og`, `white-fire-og`, `wedding-cake`, `tropicana-cookies`) include visible sugar-leaf blades on the bud itself, which is inherent to flower photography and is present in the existing Unsplash set too — not the "cannabis leaf as iconography" the rule is aimed at. `alien-og` has the most prominent leaf and is left unused for that reason.

### 2.2 Strain names — vetted

**D8 — fifteen new strains**, all publicly used hemp/CBD cultivar names rather than brands or trademarks.

Carried from the approved draft:

| # | Strain | Note |
|---|---|---|
|1|Sour Lifter|Lifter-lineage CBD cultivar, sold by many unaffiliated farms|
|2|Cherry Blossom|Widely grown CBD cultivar|
|3|Berry Blossom|Widely grown CBD cultivar (Cherry Kandy × Chardonnay lineage)|
|4|Cherry Cobbler|Documented CBD cultivar|
|5|Carolina Dream|Documented CBD cultivar|
|6|Sour Tsunami|Historic CBD-rich cultivar (Lawrence Ringo); generic cultivar name|
|7|Abacus|Documented CBD cultivar|
|8|BaOx|Documented industrial/CBD hemp variety. **Spelling corrected** from "Boax" in the first draft — BaOx is the canonical form|
|9|Umpqua|Oregon hemp cultivar; geographic name, and it fits the "grown on licensed farms in Oregon" copy|
|10|Otto II|Long-established CBD hemp cultivar|

Five added in this revision:

| # | Strain | Verdict |
|---|---|---|
|11|Suzy Q|**Accept.** Well-documented high-CBD, low-THC cultivar in generic use across many farms. Not a trademark. Key `SUZYQ`, slug `suzy-q-hemp-flower`|
|12|Harle-Tsu|**Accept.** Famous CBD cultivar (Harlequin × Sour Tsunami), bred by Lawrence Ringo, grown generically industry-wide. Key `HARLETSU`, slug `harle-tsu-hemp-flower` — the hyphen is fine under `SLUG_PATTERN`|
|13|Ringo's Gift|**Accept, with a note.** Famous CBD cultivar named in memory of breeder Lawrence Ringo; used freely by dozens of farms, not a trademark. The apostrophe lives in `name`/`strain` only; slug is `ringos-gift-hemp-flower`, key `RINGOS`. Reads as a person's name — see Q5|
|14|Harlequin|**Accept.** Historic, heavily documented CBD-rich cultivar. "Harlequin" is a commedia dell'arte term in general use; the romance publisher's mark is a different class and the cultivar name is industry-generic. Accepting it is consistent with accepting Harle-Tsu, which is derived from it. Key `HARLEQUIN`|
|15|The Wife|**Accept, with a note.** Genuine, well-documented high-CBD cultivar from Colorado, used generically, no trademark. "The Wife hemp flower" reads oddly on a storefront — see Q5. Key `WIFE`, slug `the-wife-hemp-flower`|

**Rejected from the new candidate list, with reasons:**
- `Cherry Kandy` — genuine cultivar and the mother of Berry Blossom, but it would be the **fourth** "Cherry" on one page (Q3 already flags three). Reserve.
- `Lemon Drop` — cannot stand behind it. It is a cocktail, a sweet, and a name attached to several unrelated products; its documentation as a *hemp cultivar* is thin and vendor-specific. Reject.
- `Super Sour Space Candy` — genuine, but we already sell Sour Space Candy. Two near-identical names on one page is bad merchandising and makes search ambiguous: the query "sour space candy" would match both. Reserve.
- `Bubba 76` — genuine, but confusable with the existing Bubba Kush CBD, and the digit breaks the SKU contract: `sku` must match `/^HB-FLW-[A-Z]+$/` (`catalog-flower.test.ts:21`), so it would force either `BUBBASEVENTYSIX` or relaxing the regex to `[A-Z0-9]+`. Not worth it. Reserve.
- `Finola`, `Katani` — **genuine and impeccably documented** (Finola is on the EU Common Catalogue; Katani is a registered Canadian variety), which is exactly why they are tempting. But both are grain and fibre varieties, not smokable CBD flower cultivars. Selling them by the jar as hand-trimmed smokable flower is a misrepresentation of a different kind from R3, and a more avoidable one. Reject.

**Exclusions from the first draft all stand:** `Magic Bullet` (famous houseware trademark), `Kush Hemp E1` (a second "kush" exception weakens the copy guard at `catalog-flower.test.ts:11-14`), `Charlotte's Web` (trademark), `Hempress` and `Frosted Lime` (could not be confirmed as independent of a single vendor), `Stormy Daniels` (publicity rights), `ACDC` / `Cannatonic` / `Juanita La Lagrimosa` (band trademark / cannabis-adjacent naming / seed-bank product name), and the CBG trio `White CBG` / `Jackpot CBG` / `Stem Cell CBG` — excluded on a data-model ground, not a naming one: `ProductSpecs` is `{ strengthMg, spectrum, labTested, servingSize, ingredients }` (`src/types/catalog.ts:35-41`) and `productSpecsSchema` is a `z.strictObject` (`src/lib/validation/product.schema.ts:25-31`), so CBG content has nowhere to live and `strengthMg` means CBD throughout. See §9.

**Critically: the photo filenames are not names.** The source files are called `runtz`, `wedding-cake`, `gelato-33`, `alien-og`, `g13`, `girl-scout-cookies` and so on. Those are marijuana strain names, several are trademarks, and all of them are misdescriptive for hemp. **The photo is reused; the name is not.** Every imported file is renamed to its destination strain slug on import (§8 T2), and no source strain name appears anywhere in code, copy, alt text or the credits' description column — only in the credits' id column, where it is the provenance record.

All 15 names are clean against the banned-word regex at `catalog-flower.test.ts:11-12`.

### 2.3 Photo assignment, with verified appearance notes

Every file below was opened and inspected. The **note** column is what is actually in the frame; the developer writes the `intro` bud clause from the converted 1200×1200 file, using the note as a starting point, not a substitute (§4, and acceptance criterion 11).

| Strain | Source file in `newImages/` | Verified appearance |
|---|---|---|
|Umpqua|`tropicana-cookies.jpg`|Mid-green chunky bud, orange hairs throughout, moderate frost, short woody stem at left|
|Sour Lifter|`frostbite.jpg`|Broad green-and-tan bud, rust-orange hairs, light even frost, small stem at right|
|Berry Blossom|`blue-cheese.jpg`|Dark green with purple patches, heavy silver frost, orange hairs, dense and rounded|
|Sour Tsunami|`girl-scout-cookies.jpg`|Pale sage and tan, dry-looking, pale straw-coloured hairs, broad and flat — the most hemp-like of the set|
|Carolina Dream|`strawberry-cough.jpg`|Pale green almost smothered in bright orange hairs; very distinctive, reads warm|
|Abacus|`bruce-banner-3.jpg`|Dark green to near-black, bright orange hairs, elongated, heavy frost|
|Cherry Blossom|`candyland.jpg`|Dark purple-grey, heavy orange hairs, very heavy frost — the purple one|
|BaOx|`black-diamond.jpg`|Pale sage-tan, dry, brown-orange hairs, woody stem at left; reads like a field variety|
|Cherry Cobbler|`black-mamba.jpg`|Mid-green, heavy orange hairs, frosted, rounded and dense|
|Otto II|`g13.jpg`|Sage green, even frost, orange hairs, chunky, woody stem at left|
|The Wife|`platinum-og.jpg`|Pale silver-green, bright yellow-orange hairs, cone-shaped, visible sugar leaf|
|Suzy Q|`mango-haze.jpg`|Round bud, pale sage, dense curled tan-orange hairs; hazy, unusual, very distinctive|
|Harlequin|`la-confidential.jpg`|Mid to dark green, orange hairs, moderate frost, broad, sugar leaf at upper left|
|Ringo's Gift|`white-fire-og.jpg`|Pale green, bright yellow-orange hairs, heavy frost, cone-shaped|
|Harle-Tsu|`wedding-cake.jpg`|Pale sage-green under heavy silvery frost, orange hairs, stem at left, broad|

**Not used — 7 spare** (stay in `reference-images/newImages/`): `alien-og` (most prominent sugar leaf), `darkside-og`, `gelato-33`, `god-s-green-crack`, `ice-cream`, `runtz`, `sunset-sherbet`. The four unused frosted/near-black ones were left out deliberately: they read most obviously as premium indoor THC flower, which is the R3.2 problem at its worst.

**Blacklisted — 1:** `star-killer-og.jpg` is the same photograph as `bruce-banner-3.jpg` (R9). Never import both.

**Rejected at source — 7:** `alien-og-eighth-caliva`, `banana-macaroon`, `black-cherry-pie`, `cake-mix-indoor`, `gary-payton-indoor`, `georgia-pie-indoor`, `super-sour-diesel` (branded jar/tin/bag/card visible).

Because the mapping is 1:1, the grid-spacing choreography from the first draft is gone. No two cards share an image anywhere — shop grid, home row, related products, search suggestions. R3 of the original draft (photo repetition) is withdrawn.

### 2.4 Why fifteen

1. **The client asked for fifteen.** 23 strains total was the decision.
2. **22 usable photos** support it comfortably with 7 spare, so a future strain does not immediately reopen the sourcing problem.
3. It keeps the catalog at **94 products / 93 active**, still under the `pageSize: 100` ceiling every `listProducts({ pageSize: 100 })` assertion depends on — but only just (R7). This is the last addition that fits without a test refactor.
4. Fifteen is what survives the name vetting in §2.2 without reaching for names I cannot stand behind.

## 3. Data model: derive, do not hand-type

*(§3.1–§3.4 were approved unchanged and are reproduced verbatim.)*

### 3.1 The size table is the single source of truth

Replace the 4-tuple `prices` and the standalone `BASE_GRAMS` with one table:

```
interface JarSize {
  grams: number;
  key: string;        // URL/SKU-safe; never renumber an existing one
  name: string;       // the radio label, e.g. "3.5 g"
  rate: number;       // price per gram as a share of the base rate; strictly decreasing
  stock: number;      // per-variant inventory
}

JAR_SIZES, smallest first — the FIRST entry is the default variant
(catalog.ts:1220 isDefault: index === 0) and therefore sets specs.strengthMg
(catalog.ts:282) and products.priceCents (catalog.ts:1217):

  { grams: 3.5, key: "3-5g", name: "3.5 g", rate: 1,     stock: 24 }
  { grams: 7,   key: "7g",   name: "7 g",   rate: 0.9,   stock: 24 }
  { grams: 14,  key: "14g",  name: "14 g",  rate: 0.8,   stock: 12 }
  { grams: 28,  key: "28g",  name: "28 g",  rate: 0.675, stock: 6  }
  { grams: 56,  key: "56g",  name: "56 g",  rate: 0.575, stock: 3  }

BASE_GRAMS is derived: JAR_SIZES[0].grams.  Type JAR_SIZES as a non-empty
tuple (readonly [JarSize, ...JarSize[]]) so BASE_GRAMS needs no non-null
assertion and no `any` — project rule: strict mode, no `any`.
```

The 0.9 / 0.8 / 0.675 rates are not invented: they are what the existing hand-typed prices already imply (Lifter's 2500 / 4500 / 8000 / 13500 is exactly ×1.8, ×3.2, ×5.4 of its base). 0.575 for 56 g continues the curve.

Pricing and strength become functions:

```
strengthMgFor(cbdPercent)  = (BASE_GRAMS * 1000 * cbdPercent) / 100
jarPriceCents(base, size)  = round((base / BASE_GRAMS) * size.grams * size.rate / 100) * 100
                             // whole dollars, matching every existing flower price
JAR_RANGE                  = `${JAR_SIZES[0].name} to ${JAR_SIZES.at(-1)!.name}`  // "3.5 g to 56 g"
```

Because `grams / BASE_GRAMS` is an integer for every size, `jarPriceCents` reduces to `base × {1, 1.8, 3.2, 5.4, 9.2}`; with `base` a whole number of dollars no rounding tie can occur, so the output is deterministic. `cbdPercent` **must be a whole number** — `productSpecsSchema` requires `strengthMg: z.number().int()` (`product.schema.ts:26`) and `assertValidSpecs` throws at seed time otherwise (`insert.ts:88-101`). A test asserts it.

### 3.2 Why no 1 g sampler (settled: no)

`isDefault: index === 0` is shared seed machinery used by every category (`catalog.ts:1210-1222`); making the default configurable is out of scope. So a 1 g head is inseparable from being the default, and that would mean: every hemp-flower card price drops from $20–$30 to ~$6–$9; `specs.strengthMg` drops to `10 × cbdPercent` (130–190 mg), which is what `SpecSheet` prints regardless of the selected size (`spec-sheet.tsx:29`) — weaker-looking than a single pre-roll at 150 mg; the copy clause becomes "roughly 190 mg per 1 g"; and `getPriceRangeCents` minimum drops to ~$6, moving the shop price filter's lower bound and putting all 23 strains at the front of `price-asc` on `/shop`. The client declined it. The derivation above keeps it a two-line change if that ever reverses.

### 3.3 Row shape and derived copy

```
interface FlowerRow {
  slug: string;              // "<kebab-strain>-hemp-flower"
  name: string;              // "<Strain> hemp flower" (Bubba keeps its longer legal name)
  strain: string;            // how the strain is named in copy; `name` starts with it
  key: string;               // SKU suffix: HB-FLW-<key>, [A-Z]+ only
  cbdPercent: number;        // whole number, from the lab report; drives specs.strengthMg
  baseCents: number;         // price of the smallest jar; the ladder derives from it
  photo: FlowerPhoto;        // file in public/images/products/hemp-flower/; alt travels with it
  aroma: string;             // the aroma clause, e.g. "sharp cheese and citrus"
  intro: string;             // description paragraph 1 (see §4)
}
```

`strain` exists because Bubba's `name` is "Bubba Kush CBD hemp flower" but its copy label is "Bubba" (`catalog-flower.ts:139`). A test asserts `name.startsWith(strain)`, which holds for all 23.

Two copy strings become templates, so neither can drift from the numbers:

```
shortDescription = `Hand-trimmed ${strain} CBD hemp flower with a ${aroma} aroma, in ${JAR_RANGE} jars.`
description      = [intro, curingParagraph(cbdPercent)]

curingParagraph(cbdPercent) =
  "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. " +
  "The flower is grown on licensed farms in Oregon. The lab report for this batch reads about " +
  `${cbdPercent}% CBD, roughly ${strengthMgFor(cbdPercent)} mg per ${BASE_GRAMS} g, and the ` +
  "batch number is printed on the lid. The glass jar ships with a two-way humidity pack."
```

With `BASE_GRAMS = 3.5` this reproduces the existing paragraph 2 of all eight strains **byte for byte** (verified: `catalog-flower.ts:44, 58, 72, 86, 100, 114, 128, 142` are identical apart from the two numbers). The only copy change to existing strains is `shortDescription`: "in 3.5 g to 28 g jars." → "in 3.5 g to 56 g jars."

This is the drift guard the invariant needs: `specs.strengthMg`, the mg figure in the copy, and the default variant's size all read from `JAR_SIZES[0]` and `cbdPercent`. Changing the ladder head cannot leave any of them behind.

### 3.4 Prices

`jarPriceCents` output by `baseCents` (cents):

| base | 3.5 g | 7 g | 14 g | 28 g | 56 g |
|---|---|---|---|---|---|
|2000|2000|3600|6400|10800|18400|
|2100|2100|3800|6700|11300|19300|
|2200|2200|4000|7000|11900|20200|
|2300|2300|4100|7400|12400|21200|
|2400|2400|4300|7700|13000|22100|
|2500|2500|4500|8000|13500|23000|
|2600|2600|4700|8300|14000|23900|
|2700|2700|4900|8600|14600|24800|
|2800|2800|5000|9000|15100|25800|
|3000|3000|5400|9600|16200|27600|

Cents per gram falls monotonically in every row (e.g. base 2300: 657.1 → 585.7 → 528.6 → 442.9 → 378.6). A test asserts this for all 23 strains and all adjacent pairs, so the rounding can never invert the curve.

**Existing prices that change (11 of 32; every 3.5 g price is unchanged):**

| Strain | base | change |
|---|---|---|
|Lifter|2500|none|
|Elektra|2500|none|
|Special Sauce|2700|7 g 4800→4900; 14 g 8500→8600; 28 g 14500→14600|
|Suver Haze|2800|28 g 15000→15100|
|Hawaiian Haze|2400|7 g 4400→4300; 14 g 7800→7700|
|Cherry Wine|2400|7 g 4400→4300; 14 g 7800→7700|
|Sour Space Candy|2600|14 g 8400→8300|
|Bubba Kush CBD|2200|14 g 7200→7000; 28 g 12000→11900|

All ≤ $2. Because no 3.5 g price moves, `products.priceCents` is unchanged for all eight, so card prices, `featured`/`price-asc`/`price-desc` ordering and `getPriceRangeCents` are unchanged for existing products. New strains span $20–$30 at 3.5 g, inside the existing $10–$799 range, so the shop price filter's bounds do not move either. Seeded order totals are recomputed from the catalog by `buildOrderRows` (`src/lib/db/seed/orders.ts` via `insert.ts:302-320`) and asserted derivedly in `seed.test.ts:181-194`, so nothing hard-codes an old price.

### 3.5 Inventory

**D9 — product-level `FLOWER_INVENTORY` stays 24; per-variant stock comes from `JAR_SIZES[].stock`.** 24 identical jars of 56 g per strain is not credible, and `VariantSeed.inventory` is already supported (`catalog.ts:254` → `catalog.ts:1218`) and already honoured at checkout: `order.service.ts:343` reads `const stock = variant ? variant.inventory : product.inventory;` and `:496-501` decrements the variant row atomically.

Consequences, all intended: the PDP shows "Only 3 left" when 56 g is selected (`LOW_STOCK_THRESHOLD = 5`, `product-purchase-panel.tsx:21-27`); 14 g and 28 g of the eight existing strains drop from 24 to 12 and 6; `products.inventory = 24` still caps the total a strain can sell, which is fine because `order.service.ts:485-489` also decrements the product row. Cards are unaffected (`product-card.tsx:36` reads `product.inventory`). The existing assertion `expect(seed.inventory).toBe(24)` (`catalog-flower.test.ts:22`) still passes.

### 3.6 Dates, sort order and pagination

**D10 — `createdAt: seedDate("2026-04-03", index * 3)` is unchanged.** New rows are **appended** at indices 8–22, so the existing eight keep their exact dates (2026-04-03 → 2026-04-24) and the rule "every 3 days from 2026-04-03" still holds for all 23.

| idx | date | strain | | idx | date | strain |
|---|---|---|---|---|---|---|
|8|2026-04-27|Umpqua| |16|2026-05-21|Cherry Cobbler|
|9|2026-04-30|Sour Lifter| |17|2026-05-24|Otto II|
|10|2026-05-03|Berry Blossom| |18|2026-05-27|The Wife|
|11|2026-05-06|Sour Tsunami| |19|2026-05-30|Suzy Q|
|12|2026-05-09|Carolina Dream| |20|2026-06-02|Harlequin|
|13|2026-05-12|Abacus| |21|2026-06-05|Ringo's Gift|
|14|2026-05-15|Cherry Blossom| |22|2026-06-08|Harle-Tsu|
|15|2026-05-18|BaOx| | | | |

Intended outcome: the 15 new strains become the newest products in the catalog, so they lead `/shop` and `/shop/hemp-flower` under the default `featured` sort (`desc(featured), desc(createdAt), asc(id)` — `src/services/product.queries.ts:142-146`). No existing product's `createdAt` moves.

- **Home page** shows the 4 newest hemp-flower products (`ROW_PRODUCT_LIMIT = 4`, `src/app/(storefront)/page.tsx:20, 35-39`): **Harle-Tsu, Ringo's Gift, Harlequin, Suzy Q** — the four best-known CBD cultivars in the range, on four visibly different photos (pale sage + silver frost / pale green + yellow-orange / mid-dark green / round pale sage with tan hairs).
- **`/shop/hemp-flower`** now has **24 products, so two pages** at `SHOP_PAGE_SIZE = 20` (`src/lib/shop-query.ts:16`) — pagination appears on this category for the first time. Page 1: the 15 new strains, then Bubba, Sour Space Candy, Cherry Wine, Elektra, Hawaiian Haze. Page 2: Suver Haze, Special Sauce, Lifter, Hemp flower jar.
- **`/shop`** goes from 4 pages to 5 (93 active at 20 per page). The 5-number `Pagination` window handles it.

### 3.7 SKUs

`HB-FLW-<key>`, keys `[A-Z]+` only (`catalog-flower.test.ts:21`). New keys, all distinct from the existing `LIFTER / SAUCE / SUVER / HAWAIIAN / ELEKTRA / CHERRY / SOURSPACE / BUBBA` and from every `HB-TIN-*`, `HB-GLS-*`, `HB-ACC-*` and `HB-PRE-FLOWER`:

`UMPQUA`, `SOURLIFTER`, `BERRYBLOSSOM`, `TSUNAMI`, `CAROLINA`, `ABACUS`, `CHERRYBLOSSOM`, `BAOX`, `COBBLER`, `OTTO`, `WIFE`, `SUZYQ`, `HARLEQUIN`, `RINGOS`, `HARLETSU`.

`CHERRY` vs `CHERRYBLOSSOM` do not collide, and neither do their variant SKUs (`HB-FLW-CHERRY-14g` vs `HB-FLW-CHERRYBLOSSOM-14g`). Catalog-wide slug and SKU uniqueness is already asserted in `catalog-brands.test.ts:126-131`.

## 4. The fifteen new rows

Ids follow the existing convention automatically: `prod_<slug>`, `var_<slug>-<key>`, `img_<slug>-1`. `specs` for every row: `{ strengthMg: strengthMgFor(cbdPercent), spectrum: "full", labTested: true, servingSize: "as needed", ingredients: ["hemp flower"] }`.

| idx | slug | name | strain | key | CBD % | strengthMg | base | photo (destination file) |
|---|---|---|---|---|---|---|---|---|
|8|`umpqua-hemp-flower`|Umpqua hemp flower|Umpqua|UMPQUA|15|525|2300|`umpqua-hemp-flower.jpg`|
|9|`sour-lifter-hemp-flower`|Sour Lifter hemp flower|Sour Lifter|SOURLIFTER|17|595|2600|`sour-lifter-hemp-flower.jpg`|
|10|`berry-blossom-hemp-flower`|Berry Blossom hemp flower|Berry Blossom|BERRYBLOSSOM|15|525|2400|`berry-blossom-hemp-flower.jpg`|
|11|`sour-tsunami-hemp-flower`|Sour Tsunami hemp flower|Sour Tsunami|TSUNAMI|13|455|2100|`sour-tsunami-hemp-flower.jpg`|
|12|`carolina-dream-hemp-flower`|Carolina Dream hemp flower|Carolina Dream|CAROLINA|14|490|2200|`carolina-dream-hemp-flower.jpg`|
|13|`abacus-hemp-flower`|Abacus hemp flower|Abacus|ABACUS|16|560|2500|`abacus-hemp-flower.jpg`|
|14|`cherry-blossom-hemp-flower`|Cherry Blossom hemp flower|Cherry Blossom|CHERRYBLOSSOM|15|525|2400|`cherry-blossom-hemp-flower.jpg`|
|15|`baox-hemp-flower`|BaOx hemp flower|BaOx|BAOX|13|455|2000|`baox-hemp-flower.jpg`|
|16|`cherry-cobbler-hemp-flower`|Cherry Cobbler hemp flower|Cherry Cobbler|COBBLER|18|630|2800|`cherry-cobbler-hemp-flower.jpg`|
|17|`otto-ii-hemp-flower`|Otto II hemp flower|Otto II|OTTO|19|665|3000|`otto-ii-hemp-flower.jpg`|
|18|`the-wife-hemp-flower`|The Wife hemp flower|The Wife|WIFE|16|560|2500|`the-wife-hemp-flower.jpg`|
|19|`suzy-q-hemp-flower`|Suzy Q hemp flower|Suzy Q|SUZYQ|14|490|2200|`suzy-q-hemp-flower.jpg`|
|20|`harlequin-hemp-flower`|Harlequin hemp flower|Harlequin|HARLEQUIN|15|525|2400|`harlequin-hemp-flower.jpg`|
|21|`ringos-gift-hemp-flower`|Ringo's Gift hemp flower|Ringo's Gift|RINGOS|17|595|2600|`ringos-gift-hemp-flower.jpg`|
|22|`harle-tsu-hemp-flower`|Harle-Tsu hemp flower|Harle-Tsu|HARLETSU|16|560|2500|`harle-tsu-hemp-flower.jpg`|

Source file → destination mapping is in §2.3.

`aroma` clause per row (feeds `shortDescription`):

| Strain | aroma |
|---|---|
|Umpqua|lemon peel and fresh pine|
|Sour Lifter|sour citrus and cheese rind|
|Berry Blossom|ripe berry and cut grass|
|Sour Tsunami|sour lemon and damp earth|
|Carolina Dream|sweet melon and citrus|
|Abacus|dark fruit and black pepper|
|Cherry Blossom|cherry skin and almond|
|BaOx|hay and mild citrus|
|Cherry Cobbler|baked cherry and vanilla|
|Otto II|pine resin and lemon zest|
|The Wife|sweet citrus and pine|
|Suzy Q|warm hay and cedar|
|Harlequin|ripe mango and damp earth|
|Ringo's Gift|sweet pine and orange peel|
|Harle-Tsu|red berry and cedar|

### `intro` — description paragraph 1

Three sentences in the house voice: **(1)** aroma, **(2)** terpene notes, **(3)** bud structure and colour. Sentences 1 and 2 are given below and are final. **Sentence 3 is a TODO the developer must write from the image.**

> **Rule (binding).** Before writing sentence 3 for a row, open the *converted* 1200×1200 file at `public/images/products/hemp-flower/<slug>.jpg` with the Read tool and describe what is actually in that frame — colour, density, hair colour, shape, whether a stem or sugar leaf is visible. The verified notes in §2.3 are a starting point taken from the 600×600 source and must be confirmed against the converted file, not copied. The same applies to the `alt` string in `FLOWER_PHOTOS`, which must describe the photo and begin "Dried flower buds". A bud clause that contradicts its photo is a review failure (acceptance criterion 11).

- **Umpqua** — "Umpqua is lemon peel over fresh pine, with a faint sweetness that shows once the jar is open. Pinene and limonene lead the terpene notes. **[TODO: bud clause from the photo.]**"
- **Sour Lifter** — "Sour Lifter is sour citrus first, with a cheese rind note underneath that comes from its Lifter side. Limonene and myrcene lead the terpene notes. **[TODO]**"
- **Berry Blossom** — "Berry Blossom leads with ripe berry over a cut-grass base and a faint peppery finish. Myrcene and beta-caryophyllene lead the terpene notes. **[TODO]**"
- **Sour Tsunami** — "Sour Tsunami is sour lemon over damp earth, with a plain, grassy finish. Myrcene and pinene lead the terpene notes. **[TODO]**"
- **Carolina Dream** — "Carolina Dream is sweet melon with a citrus edge and a light floral note behind it. Terpinolene and limonene lead the terpene notes. **[TODO]**"
- **Abacus** — "Abacus is dark fruit over black pepper, resinous and a little musty as it is broken apart. Beta-caryophyllene and myrcene lead the terpene notes. **[TODO]**"
- **Cherry Blossom** — "Cherry Blossom is cherry skin and almond, sweet at the front with a dry finish. Myrcene and beta-caryophyllene lead the terpene notes. **[TODO]**"
- **BaOx** — "BaOx is hay and mild citrus, the plainest of the strains we stock and the closest to a field variety. Myrcene leads the terpene notes with a little pinene behind it. **[TODO]**"
- **Cherry Cobbler** — "Cherry Cobbler is baked cherry over vanilla, sweeter than Cherry Wine and heavier on the finish. Myrcene, limonene and beta-caryophyllene lead the terpene notes. **[TODO]**"
- **Otto II** — "Otto II is pine resin with lemon zest over it, sharp and clean rather than sweet. Pinene and limonene lead the terpene notes. **[TODO]**"
- **The Wife** — "The Wife is sweet citrus over pine, light and even from the first time the jar is opened. Limonene and pinene lead the terpene notes. **[TODO]**"
- **Suzy Q** — "Suzy Q is warm hay and cedar, dry and plain with almost no sweetness to it. Myrcene and beta-caryophyllene lead the terpene notes. **[TODO]**"
- **Harlequin** — "Harlequin is ripe mango over damp earth, one of the older names in CBD growing and still one of the most recognisable. Myrcene and pinene lead the terpene notes. **[TODO]**"
- **Ringo's Gift** — "Ringo's Gift is sweet pine with orange peel behind it, named for the grower who bred its parents. Pinene, myrcene and limonene lead the terpene notes. **[TODO]**"
- **Harle-Tsu** — "Harle-Tsu is red berry over cedar, a cross of Harlequin and Sour Tsunami and drier than either. Myrcene and beta-caryophyllene lead the terpene notes. **[TODO]**"

Copy rules (unchanged, enforced by `catalog-flower.test.ts:89-105`): banned in copy, alt and comments — THC, cannabis, marijuana, weed, kush (Bubba's name and slug are the only exceptions), smoke/smoking, toke, hit, herb, dab, hash, high, potency, wellness, relief, sleep, treat, bare "cure" (use "cured"/"curing"), buzz, stoned, relax, calm, euphoric, uplift, energising, sativa, indica, psychoactive, intoxicating. No effect or health claims, no THC figures. All 15 sentence pairs above are clean; each completed `intro` must exceed the 80-character floor (trivially satisfied); every derived `shortDescription` satisfies the one-sentence regex `/^[^.]+(\.\d[^.]*)*\.$/` (the "3.5" decimal is why that regex looks the way it does).

## 5. Code, asset and doc changes

- **`src/lib/db/seed-data/catalog-flower.ts`** — all of §3 and §4: add `FLOWER_PHOTOS` + `FlowerPhoto` (25 entries), replace `BASE_GRAMS`/`prices` with `JAR_SIZES` + `jarPriceCents` + `strengthMgFor` + `JAR_RANGE`, reshape `FlowerRow`, rewrite `flowerVariants(baseCents)` to map `JAR_SIZES` (including `inventory: size.stock`), append the 15 rows. Update the file-header JSDoc: it says "eight CBD hemp flower products … each with one own photo" — it must now say twenty-three strains, each with its own photo, keep the placeholder-lab-values disclosure, add a line that fifteen of the photos are third-party dispensary shots pending replacement (R3), and point at this spec alongside the 2026-09-22 one.
- **`src/lib/db/seed-data/catalog.ts:239`** — the `hemp-flower` category description: "…in 3.5 g to 28 g jars." → "…in 3.5 g to 56 g jars." Only line in this file that changes.
- **`public/images/products/hemp-flower/`** — 15 new files (T2), taking the directory from 10 to 25.
- **`public/images/newImages/`** — **move the whole folder to `/home/cpt/dev/main/Haven-Ways/reference-images/newImages/`.** Move, never delete (the glassware spec §4 set that precedent, and the 7 spare photos plus the rejects are worth keeping). Reasons, in order: (a) it fails `src/lib/public-images.test.ts:15-21` today (R8); (b) anything under `public/` is served, and `.vercelignore:1` records that `vercel deploy` uploads the working tree, so a `.gitignore` entry would **not** stop 599 California THC packaging shots being published on the storefront's domain (R10) — `.gitignore` is the wrong tool here; (c) 51 MB in a public repo. If for some reason the folder must stay in place, it needs entries in **both** `.gitignore` and `.vercelignore`, and `public-images.test.ts` would have to be loosened, which is a worse outcome. Recommendation: move it.
- **`data/products.json`** — **move to `/home/cpt/dev/main/Haven-Ways/reference-images/`** (or delete, since `reference-images/products.json` already holds the same 606 products). It is a 608 KB scraped third-party dispensary catalog, nothing in `src/` imports it (verified: the only references anywhere are `.vercelignore:3`, `README.md:132` and three spec documents), and while `.vercelignore:3` already keeps it out of deploys, it is **not** in `.gitignore`, so committing it would publish the scrape in a public repo. It does not belong in the tree.
- **`docs/image-credits.md`** — two edits.

  **(a)** Extend the exception paragraph. After the existing sentence in paragraph 2 that ends "…and three products were dropped for showing a leaf (see the glassware and brand tinctures spec).", add:

  > Fifteen of the strain photos in `products/hemp-flower/` fall under the same exception with one important difference, recorded here rather than buried: they are a dispensary's product photography of **cannabis flower of unverified THC content**, not of hemp, and not of the product we sell. They are used only to illustrate what a cured flower bud looks like beside each hemp cultivar's description. They are not photographs of the batch, they are not photographs of hemp, and no claim to the contrary appears in the product copy or the alt text. Permission has not been granted; these fifteen must be replaced with the client's own photography before launch. The id column holds the source filename from the supplied image set.

  **(b)** Add 15 table rows, one per imported file, in the existing column order `File | Id | Creator | License | Source URL | Notes`:

  ```
  | `products/hemp-flower/<strain-slug>.jpg` | <source filename, e.g. tropicana-cookies.jpg> | Unknown (dispensary) | Third-party product image, no permission granted; replace before launch | Supplied image set, no source URL recorded | Cannabis flower of unverified THC content, used to illustrate a hemp cultivar. <neutral one-line description of the bud>. Upscaled from a 600 px square source to 1200 px. |
  ```

  Leave the existing intro sentence about the eight Unsplash strain photos **as it is** — it remains true of those eight. Do not describe the new files as "hemp" or as "dried flower" in a way that implies hemp; the description column must say cannabis.

### Derived counts after the change

| | before | after |
|---|---|---|
|categories (flag on / off)|8 / 6|8 / 6|
|products / active|79 / 78|**94 / 93**|
|product images|148|**163**|
|product variants|—|**+83** (8 existing strains × the new 56 g, plus 15 × 5)|
|hemp-flower active|9|**24**|
|hemp-pre-rolls|3|3|
|visible active, flag off|66|66|
|files in `products/hemp-flower/`|10|**25**|
|`/shop` pages at 20/page|4|**5**|
|`/shop/hemp-flower` pages|1|**2**|

## 6. Tests

All test changes are colocated with their source. `pnpm test` needs no Docker — `src/test/db.ts:26` defaults to in-memory PGlite.

**`src/lib/db/seed-data/catalog-flower.test.ts`** (node env, extend in place):
- Count 8 → 23; keep the per-seed `category`, `sku` regex, `inventory` 24, `images` length 1 assertions. Replace `expect(seed.images?.[0]?.file).toBe(\`${seed.slug}.jpg\`)` with: the file is a key of the exported `FLOWER_PHOTOS`, and `seed.images[0].alt === FLOWER_PHOTOS[file]` — this is the assertion that keeps alt text tied to the photo.
- **New:** every key of `FLOWER_PHOTOS` exists on disk under `public/images/products/hemp-flower/` (`existsSync`), **and** every file in that directory is a key of `FLOWER_PHOTOS` — so an orphaned or missing photo fails the build rather than the storefront, and the credits table cannot silently go stale.
- **New (replaces the old "no photo used by more than 2 products" rule):** every hemp-flower product's photo is **distinct** — `new Set(files).size === files.length` across all 23 strains, and no strain reuses `flower-jar.jpg` or `flower-buds.jpg` (which belong to `hemp-flower-jar`).
- Variants: five entries, `[["3-5g","3.5 g"],["7g","7 g"],["14g","14 g"],["28g","28 g"],["56g","56 g"]]`; total price strictly ascending (keep); **cents per gram strictly decreasing** across every adjacent pair (new); every price a whole number of dollars (`% 100 === 0`); each variant's `inventory` equals the matching `JAR_SIZES[].stock`.
- **New, the drift guard:** parse the grams out of `variants[0].name` (`/^([\d.]+) g$/`) and assert `specs.strengthMg === grams * 1000 * cbdPercent / 100`, with `cbdPercent` taken from the copy. Asserting through the *variant name* rather than through `BASE_GRAMS` is what makes a future ladder change impossible to get wrong.
- Generalise the copy regex from the hard-coded `per 3\.5 g` to one built from `JAR_SIZES[0]`, and add `expect(Number.isInteger(seed.specs.strengthMg)).toBe(true)`.
- Dates: same rule, now 23 rows.
- Copy rules: keep alt starts "Dried flower buds", the one-sentence `shortDescription` regex, 2 paragraphs, each > 80 chars. Add: `shortDescription` ends with `in ${JAR_RANGE} jars.`; `name.startsWith(strain)`; `shortDescription` contains `strain`; slugs all end `-hemp-flower`; slugs and keys unique.
- Banned words: unchanged, still only the Bubba exception. **New:** no strain `name`, `slug` or `alt` contains any of the source photo filenames' strain words — assert against the list `["runtz","wedding cake","gelato","alien og","g13","girl scout","platinum og","la confidential","white fire","black mamba","black diamond","bruce banner","candyland","frostbite","mango haze","strawberry cough","tropicana","blue cheese"]`. This is the guard that stops a marijuana strain name leaking from a filename into customer-facing copy.

**`src/services/product.service.test.ts`** (DB-backed):
- `:396` `smokableHemp ? 9 : 0` → `? 24 : 0`.
- `:402-405` strains still have a per-slug photo, so this assertion **stays as it is** — `[\`/images/products/hemp-flower/${slug}.jpg\`]` holds for all 23.
- `:409` variant names → `["3.5 g","7 g","14 g","28 g","56 g"]`.
- `:414` `expect(firstImages.size).toBe(strains.length)` **stays** — the 1:1 mapping keeps it true and it is now the primary uniqueness guard at the service layer.
- **New regression test, next to "keeps specs.strengthMg in sync with the default '<n> mg' variant" (`:101-109`):** over `listProducts({ category: "hemp-flower", pageSize: 100 })`, for every product whose **default** variant name matches `/^([\d.]+) g$/`, take `cbdPercent` from the second description paragraph and assert `specs.strengthMg === grams * 1000 * cbdPercent / 100`. This proves the coupling survives the seed → Postgres → service round trip, which is where the Phase 1 blocker would have shown up. It also covers `hemp-flower-jar` (3.5 g / 525 mg).
- `:562-580` "all category and product images are self-hosted" now walks 163 images including the 15 new files — it is the test that catches a failed or misnamed conversion.

**`src/services/category.service.test.ts:109`** — `flower?.productCount` 9 → **24**. `sortOrder` 7 unchanged; pre-rolls 3 / sortOrder 6 unchanged; glassware sortOrder 8 unchanged.

**`src/lib/variant-legend.test.ts:19-29`** — extend the grams case to the five names including `"56 g"`; still `"Size"`.

**`src/lib/public-images.test.ts`** — **unchanged, and must go from red to green** when `newImages/` leaves the tree (R8). Do not edit it.

**Unchanged and must stay green without edits** (they are derived; confirming that is part of acceptance): `src/lib/db/seed/seed.test.ts` (`categories: 8`, everything else from `catalog.*.length`), `src/lib/db/seed/assert-valid-specs.test.ts`, `src/lib/db/seed-data/catalog-brands.test.ts` (including catalog-wide slug/SKU uniqueness at `:126-131`), `src/services/content.service.test.ts`, `src/services/order.service.test.ts`, `src/services/review.service.test.ts`.

**Copy guard (manual, before review):**
```
cd /home/cpt/dev/main/Haven-Ways/weed-website
grep -niE "\b(thc|cannabis|marijuana|weed|kush|smoke|smoking|toke|hit|herb|dab|hash|high|potency|wellness|relief|sleep|treat|cure|buzz|stoned|relax|calm|euphoric|uplift|energising|sativa|indica|psychoactive|intoxicating)\b" src/lib/db/seed-data/catalog-flower.ts
```
Must match only the Bubba slug/name/photo lines.

## 7. Acceptance criteria

1. `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all clean. No `any`, no non-null assertion added to dodge the `JAR_SIZES` tuple typing.
2. 23 strains + `hemp-flower-jar` = 24 active hemp-flower products; 94 products / 93 active; 163 product images; 8 categories flag-on, 6 flag-off.
3. Every strain PDP shows a "Size" legend with exactly five options — 3.5 g, 7 g, 14 g, 28 g, 56 g — in that order, 3.5 g preselected, and "Strength" equal to `35 × cbdPercent` mg.
4. `products.priceCents` is unchanged for all eight existing strains and for `hemp-flower-jar`; only the 11 non-default prices in §3.4 move, each by ≤ $2.
5. For every strain: total price strictly ascending across the five sizes **and** cents-per-gram strictly decreasing. Asserted by test.
6. `specs.strengthMg` equals the default (first) variant's size × CBD % for every hemp-flower product, verified through `productService.listProducts`, and the mg figure in the copy equals `specs.strengthMg`.
7. `public/images/products/hemp-flower/` holds exactly 25 files; all 15 new files are **1200×1200 sRGB, metadata-stripped, ≤ 250 KB**; every `FLOWER_PHOTOS` key exists on disk and every file on disk is a key.
8. **No image is the primary of two products** anywhere in the catalog — shop grid, home row, related products, search suggestions.
9. `public/images` contains exactly `bands, categories, payments, products, promo` — `public-images.test.ts` green. `public/images/newImages/` and `data/products.json` are out of the working tree and absent from `git status`.
10. **No marijuana strain name from a source filename appears anywhere in code, copy, alt text, slugs or SKUs** — only in the id column of `docs/image-credits.md`. Asserted by the guard in §6.
11. **Every bud-appearance clause and every alt string was written after opening the converted 1200×1200 file**, and matches it. Spot-check at review: pick 3 strains at random, open the image, read the sentence.
12. `docs/image-credits.md` has 15 new rows and the R3 paragraph; it says "cannabis of unverified THC content", it does not call the new files hemp, and it states the replace-before-launch condition. The existing sentence about the eight Unsplash photos is untouched and still true.
13. With `smokableHemp` off, all 24 vanish from listings, search, suggestions, featured, related and the category rail, and `/shop/hemp-flower` 404s. (Temporarily flip the flag, run the suite, revert.)
14. `/shop/hemp-flower` paginates correctly across 2 pages with no horizontal overflow at 375, 768, 1024, 1280 and 1536 px; `/shop` shows 5 pages.
15. Home page's first category row is Hemp flower showing Harle-Tsu, Ringo's Gift, Harlequin, Suzy Q on four different photos.
16. The copy guard grep matches only the Bubba lines; no new name or line of copy contains an effect or health claim.
17. Search returns the new strains: "harlequin", "suzy", "abacus", "cobbler" and `HB-FLW-BAOX` all find the right product with the flag on and nothing with it off.
18. Zero diff outside: `src/lib/db/seed-data/catalog-flower.ts`, `src/lib/db/seed-data/catalog-flower.test.ts`, `src/lib/db/seed-data/catalog.ts` (one line), `src/services/product.service.test.ts`, `src/services/category.service.test.ts`, `src/lib/variant-legend.test.ts`, `docs/image-credits.md`, the 15 new image files, and this spec. No migration file. No `src/lib/db/schema.ts` change. No `public-images.test.ts` change.

## 8. Tasks, in implementation order

### T1 — Size ladder and derivation (no new strains yet)
Files: `src/lib/db/seed-data/catalog-flower.ts`, `src/lib/db/seed-data/catalog-flower.test.ts`, `src/lib/db/seed-data/catalog.ts` (line 239), `src/lib/variant-legend.test.ts`, `src/services/product.service.test.ts`.
Approach: introduce `FLOWER_PHOTOS` (10 entries for now), `JAR_SIZES`, `jarPriceCents`, `strengthMgFor`, `JAR_RANGE` and `curingParagraph`; reshape `FlowerRow` and rewrite the existing eight rows to the new shape (same slugs, names, keys, CBD percentages, `baseCents` = current 3.5 g price, own photo file); add the 56 g variant and per-variant stock; update the ladder-related tests.
Verify: `pnpm typecheck && pnpm lint && pnpm format:check` clean. `pnpm test` will still fail on `public-images.test.ts` until T2 — **that one failure is expected here and nothing else may fail.** Diff the emitted seed before/after: the only changes are the 11 prices in §3.4, the `56g` variants, per-variant inventory, and "28 g"→"56 g" in the nine `shortDescription`s plus the category description. Paragraph 2 of all eight strains must be byte-identical. A strain PDP shows five sizes with 3.5 g selected and unchanged Strength.

### T2 — Image import and asset hygiene *(new)*
Files: `public/images/products/hemp-flower/*.jpg` (15 new), `public/images/newImages/` (moved out), `data/products.json` (moved out), `docs/image-credits.md`.
Approach, in this order:
1. **Re-verify the source set before converting.** Open each of the 15 source files listed in §2.3 with the Read tool and confirm: single bud, white background, no packaging, label, card, tin, jar, branding, watermark, text, person, smoke or lit material. Confirm `star-killer-og.jpg` is not among them (R9). Any file that fails inspection is replaced from the 7 spares and the swap is recorded in this spec under a "Substituted during inspection" heading, exactly as the glassware spec did.
2. **Convert one at a time**, source → destination slug:
   ```
   magick public/images/newImages/<source>.jpg -limit memory 256MiB \
     -colorspace sRGB -resize 1200x1200 -strip -interlace JPEG -quality 82 \
     public/images/products/hemp-flower/<strain-slug>.jpg
   ```
   Re-run at `-quality 75` if the output exceeds 250 KB. The sources are already square, 600×600, on white, so this is a straight 2× upscale — the same treatment `docs/image-credits.md` already records for the glassware and several Openverse sources.
3. **Read every converted file** and confirm the upscale did not introduce artefacts and the subject is intact. Write the `alt` string and note the bud's colour/structure for T3's `intro` clause while the image is open.
4. **Move `public/images/newImages/` to `/home/cpt/dev/main/Haven-Ways/reference-images/newImages/`** and **move `data/products.json` to `/home/cpt/dev/main/Haven-Ways/reference-images/`** (or delete the latter if a byte-comparison confirms it is redundant with the copy already there). Move, never delete.
5. **Write the `docs/image-credits.md` changes** from §5 — the exception paragraph and 15 rows.
Verify: `find public/images/products/hemp-flower -type f | wc -l` = 25; `identify` reports 1200×1200 sRGB for all 15; none over 250 KB; `public/images` root holds exactly the five known folders; `git status` shows no `newImages` and no `data/`; `pnpm test` now green **except** for the flower-count assertions T3 will fix.

### T3 — The fifteen new strains
Files: `src/lib/db/seed-data/catalog-flower.ts`, `src/lib/db/seed-data/catalog-flower.test.ts`, `src/services/product.service.test.ts`, `src/services/category.service.test.ts`.
Approach: extend `FLOWER_PHOTOS` to 25 entries with the alt strings written in T2; append the 15 rows from §4 at indices 8–22 in that exact order (the order sets the dates, the home row and the page split in §3.6); write each `intro`'s third sentence from the converted image per the binding rule in §4; bump the two `9`s to `24`.
Verify: full suite green; acceptance criteria 2, 8, 10, 11, 13, 14, 15, 16, 17; copy guard grep clean; `pnpm dev` and walk `/shop/hemp-flower` pages 1 and 2 at 375 / 768 / 1024 / 1280 / 1536, three new PDPs (check the bud description against the photo shown), the home hemp-flower row, the category rail, and search.

### T4 — Release (only after test, review and security stages pass)
Approach: `pnpm db:seed --target=neon` **without** `--force` — if the guard refuses, stop and ask the user (R6). Then `vercel deploy` a preview immediately. Before handing the preview over, confirm `https://<preview>/images/newImages/runtz.jpg` returns 404 — that is the check that R10 was actually handled. Ask the user to check `/shop/hemp-flower` (24 results over 2 pages, five sizes on a strain PDP), `/product/harle-tsu-hemp-flower`, `/product/hemp-flower-jar`, the home first row, the rail at 375/768/1280, and search "harlequin". `vercel deploy --prod` only after the user's explicit "go".
Note: production currently reads mock data, not Neon, so the reseed alone does not change production.

Suggested commit message: `feat: expand hemp flower to 23 strains and add a 56 g jar`

## 9. MVP vs nice-to-haves

**MVP (this spec):** the 3.5–56 g ladder; derived prices, `strengthMg` and copy; per-variant stock; 15 new strains each with its own photo; the image import and asset cleanup; the truthful `image-credits.md`; the tests in §6.

**Nice-to-haves, explicitly not now:**
- **Replace the 15 imported photos with the client's own photography** — the only item here that is also a launch blocker (R3). Each swap is one file plus one `FLOWER_PHOTOS` alt string, and then the credits paragraph and 15 rows come back out.
- **1 g sampler** — prepend one `JAR_SIZES` row; everything else derives. Declined by the client.
- **112 g bulk** (Q2) — one `JAR_SIZES` row at `rate ≈ 0.50`, `stock: 2`. Blocked on counsel (R1).
- **The 7 spare photos** — enough for 7 more strains, but see R7: the catalog is 7 products from the `pageSize: 100` ceiling, so the next expansion needs the test-helper pagination refactor first.
- **CBG cultivars** (White CBG, Jackpot CBG, Stem Cell CBG) — needs a `ProductSpecs` decision first: `strengthMg` means CBD catalog-wide, `productSpecsSchema` is a strict object, and `SpecSheet` prints one "Strength" row. Either add an optional cannabinoid breakdown (schema + spec sheet + admin form + every seed) or do not sell CBG flower. Do not fudge it by putting CBG milligrams in `strengthMg`.
- **Bring `hemp-flower-jar` onto the shared ladder** — it keeps its 2-size 3.5/7 g ladder and its "3.5 g or 7 g" copy, which now reads oddly beside twenty-three five-size strains. Deliberately untouched (it is a `catalog.ts` house product with its own id, SKU `HB-PRE-FLOWER` and copy).
- Per-strain reviews for the new strains; a "photo is representative" note on flower PDPs; a compare-at price on 56 g; making `SpecSheet` react to the selected variant so "Strength" tracks the chosen jar.

**Observed, out of scope, do not fix here:** variant SKUs are `HB-FLW-LIFTER-3-5g` — lowercase, so they would fail `SKU_PATTERN` (`src/lib/validation/product.schema.ts:7`). Pre-existing across every category; `SKU_PATTERN` only gates admin input, never the seed. Flag it, leave it.

## 10. Open questions for the human

1. **Q1** The 15 photos show high-THC marijuana, not hemp (R3.2). Proceed to preview on that basis, or hold the new strains until the client's own photography exists? Asked once more in writing because it is the one decision here that can reach a customer as a misdescription.
2. **Q2** 56 g only, or also 112 g? Default: 56 g only.
3. **Q3** Three "Cherry" strains out of twenty-three — acceptable, or swap Cherry Cobbler for a reserve (Cherry Kandy is itself a Cherry, so the reserve would be The Wife's replacement set)?
4. **Q4** "Otto II" or "Otto 2"?
5. **Q5** Keep the real cultivar names "Ringo's Gift" and "The Wife", or substitute reserves? Recommendation: keep them — using genuine cultivar names is the whole basis of §2.2, and inventing prettier ones would undo it.
6. **Q6** Does the pending production "go" cover this expansion, or is a fresh approval needed after the preview?
7. **Where should the moved assets live?** This spec says `/home/cpt/dev/main/Haven-Ways/reference-images/newImages/` and `/home/cpt/dev/main/Haven-Ways/reference-images/products.json`, matching the glassware precedent. Confirm, or name another location outside the repo.
8. **When do the real COA values arrive?** Every CBD percentage and terpene note is a placeholder (R2) and must be replaced before launch. Also confirm the inherited claims — "grown on licensed farms in Oregon", "three to four week cure", "batch number printed on the lid", "two-way humidity pack" — are true of the real supplier. They are factual assertions about the product, not marketing.
9. **Does per-variant stock (24/24/12/6/3) match reality?** If the supplier holds bulk deeper than retail, the numbers invert and `JAR_SIZES[].stock` changes.
