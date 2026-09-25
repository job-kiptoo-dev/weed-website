/**
 * Hemp flower strains: twenty-three CBD hemp flower strains sold by the jar,
 * each with its own photo (`images`) instead of a gallery from the shared
 * photo pools. Photos stand for the strain, not the batch; sources are listed
 * in `docs/image-credits.md`. Fifteen of the photos are third-party
 * dispensary product photography, not of hemp and not of anything we sell,
 * standing in for the strain; the credits record what they show. They are a
 * launch blocker until replaced with our own photography (spec risk R3).
 * Copy is ours. CBD figures and terpene notes are placeholders in the shape
 * of a lab report and must be replaced with real batch values before launch.
 * Jar sizes, prices, `specs.strengthMg` and the size and strength figures in
 * the copy are all derived from `JAR_SIZES` and each row's `cbdPercent` and
 * `baseCents`, so they cannot drift apart. See
 * `docs/superpowers/specs/2026-09-22-hemp-flower-design.md` and
 * `docs/superpowers/specs/2026-09-25-hemp-flower-range-expansion-design.md`.
 */
import type { ProductSeed } from "./catalog";
import { seedDate } from "./catalog-brands";

/**
 * Every file in `public/images/products/hemp-flower/` with its alt text. The
 * alt describes the photograph, so it lives beside the file name rather than
 * on the strain.
 */
export const FLOWER_PHOTOS = Object.freeze({
  "lifter-hemp-flower.jpg":
    "Dried flower buds in a small stack, lime green with orange hairs, on a pale grey background",
  "special-sauce-hemp-flower.jpg":
    "Dried flower buds, one dark green bud with a short stem on a white background",
  "suver-haze-hemp-flower.jpg":
    "Dried flower buds, two pale green tapered buds side by side on a white background",
  "hawaiian-haze-hemp-flower.jpg":
    "Dried flower buds, several loose pale green buds with orange hairs on a white background",
  "elektra-hemp-flower.jpg":
    "Dried flower buds in close-up, a green bud with rust-coloured hairs against a dark grey background",
  "cherry-wine-hemp-flower.jpg":
    "Dried flower buds, one long deep purple bud on a white reflective surface",
  "sour-space-candy-hemp-flower.jpg":
    "Dried flower buds, two pale tan and green buds resting against each other on a white background",
  "bubba-kush-cbd-hemp-flower.jpg":
    "Dried flower buds, two dense green buds with rust-coloured hairs on a glossy white surface",
  "umpqua-hemp-flower.jpg":
    "Dried flower buds, one chunky mid-green bud with orange hairs, a light frost and a short stem at left, on a white background",
  "sour-lifter-hemp-flower.jpg":
    "Dried flower buds, one broad green bud with rust-orange hairs, a light even frost and a small stem at right, on a white background",
  "berry-blossom-hemp-flower.jpg":
    "Dried flower buds, one dense rounded bud, dark green with purple patches under a heavy silver frost and orange hairs, on a white background",
  "sour-tsunami-hemp-flower.jpg":
    "Dried flower buds, one broad pale sage and tan bud with pale peach hairs on a white background",
  "carolina-dream-hemp-flower.jpg":
    "Dried flower buds, one rounded pale green bud almost covered in bright orange hairs on a white background",
  "abacus-hemp-flower.jpg":
    "Dried flower buds, one long dark green bud, near black in places, with bright orange hairs and a heavy frost on a white background",
  "cherry-blossom-hemp-flower.jpg":
    "Dried flower buds, one purple-grey bud under a heavy frost with curled orange hairs on a white background",
  "baox-hemp-flower.jpg":
    "Dried flower buds, one pale sage and tan bud with brown-orange hairs and a woody stem at left on a white background",
  "cherry-cobbler-hemp-flower.jpg":
    "Dried flower buds, one dense mid-green bud with rust-orange hairs and a light frost, darker at the right edge, on a white background",
  "otto-ii-hemp-flower.jpg":
    "Dried flower buds, one chunky sage-green bud with orange hairs, an even frost and a long woody stem at left, on a white background",
  "the-wife-hemp-flower.jpg":
    "Dried flower buds, one cone-shaped pale silver-green bud with yellow-orange hairs and small sugar leaves at the edges on a white background",
  "suzy-q-hemp-flower.jpg":
    "Dried flower buds, one round pale sage bud wrapped in long curled tan hairs on a white background",
  "harlequin-hemp-flower.jpg":
    "Dried flower buds, one broad mid to dark green bud with orange hairs, a light frost and a sugar leaf at upper left, on a white background",
  "ringos-gift-hemp-flower.jpg":
    "Dried flower buds, one cone-shaped pale green bud with bright yellow-orange hairs and a heavy frost on a white background",
  "harle-tsu-hemp-flower.jpg":
    "Dried flower buds, one broad pale sage-green bud under a silvery frost with orange hairs and a stem at left, on a white background",
  "flower-jar.jpg":
    "Dried flower buds with orange hairs inside an open clear glass jar",
  "flower-buds.jpg": "Close-up of dried flower buds on a white cloth",
} as const);

export type FlowerPhoto = keyof typeof FLOWER_PHOTOS;

interface JarSize {
  grams: number;
  /** URL and SKU safe; never renumber an existing one. */
  key: string;
  /** The radio label, e.g. "3.5 g". */
  name: string;
  /** Price per gram as a share of the base rate; strictly decreasing. */
  rate: number;
  /** Per-variant inventory. */
  stock: number;
}

/**
 * The jar sizes, smallest first. The first entry is the default variant, so
 * it sets `products.priceCents` and `specs.strengthMg`.
 */
export const JAR_SIZES: readonly [JarSize, ...JarSize[]] = [
  { grams: 3.5, key: "3-5g", name: "3.5 g", rate: 1, stock: 24 },
  { grams: 7, key: "7g", name: "7 g", rate: 0.9, stock: 24 },
  { grams: 14, key: "14g", name: "14 g", rate: 0.8, stock: 12 },
  { grams: 28, key: "28g", name: "28 g", rate: 0.675, stock: 6 },
  { grams: 56, key: "56g", name: "56 g", rate: 0.575, stock: 3 },
];

/** Grams in the default (smallest) jar; `strengthMg` is the CBD it holds. */
const BASE_GRAMS = JAR_SIZES[0].grams;

const LARGEST_JAR = JAR_SIZES.reduce((_, size) => size);

/** "3.5 g to 56 g". */
export const JAR_RANGE = `${JAR_SIZES[0].name} to ${LARGEST_JAR.name}`;

const FLOWER_INVENTORY = 24;

/** CBD in the default jar, in mg. `cbdPercent` must be a whole number. */
function strengthMgFor(cbdPercent: number): number {
  return (BASE_GRAMS * 1000 * cbdPercent) / 100;
}

/** Price of `size` in whole dollars, from the default jar's price. */
function jarPriceCents(baseCents: number, size: JarSize): number {
  return (
    Math.round(((baseCents / BASE_GRAMS) * size.grams * size.rate) / 100) * 100
  );
}

/** Description paragraph 2, shared by every strain. */
function curingParagraph(cbdPercent: number): string {
  return (
    "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. " +
    "The flower is grown on licensed farms in Oregon. The lab report for this batch reads about " +
    `${cbdPercent}% CBD, roughly ${strengthMgFor(cbdPercent)} mg per ${BASE_GRAMS} g, and the ` +
    "batch number is printed on the lid. The glass jar ships with a two-way humidity pack."
  );
}

interface FlowerRow {
  /** "<kebab-strain>-hemp-flower". */
  slug: string;
  /** "<Strain> hemp flower"; starts with `strain`. */
  name: string;
  /** How the strain is named in copy. */
  strain: string;
  /** SKU suffix: `HB-FLW-<key>`, `[A-Z]+` only. */
  key: string;
  /** Whole-number CBD by weight from the lab report; drives `specs.strengthMg`. */
  cbdPercent: number;
  /** Price of the smallest jar in cents; the other sizes derive from it. */
  baseCents: number;
  photo: FlowerPhoto;
  /** The aroma clause of the short description, e.g. "sharp cheese and citrus". */
  aroma: string;
  /** Description paragraph 1: aroma, terpene notes, then the buds. */
  intro: string;
}

/** Oldest first; the index sets `createdAt`. Exported for the copy tests. */
export const flowerRows: readonly FlowerRow[] = [
  {
    slug: "lifter-hemp-flower",
    name: "Lifter hemp flower",
    strain: "Lifter",
    key: "LIFTER",
    cbdPercent: 16,
    baseCents: 2500,
    photo: "lifter-hemp-flower.jpg",
    aroma: "sharp cheese and citrus",
    intro:
      "Lifter opens with a sharp cheese and fuel note over a citrus edge that carries as soon as the jar is open. Myrcene and beta-caryophyllene sit at the top of the terpene notes. The buds are dense and medium sized in a pale lime green, with rust-coloured hairs running through them.",
  },
  {
    slug: "special-sauce-hemp-flower",
    name: "Special Sauce hemp flower",
    strain: "Special Sauce",
    key: "SAUCE",
    cbdPercent: 17,
    baseCents: 2700,
    photo: "special-sauce-hemp-flower.jpg",
    aroma: "dark berry and earth",
    intro:
      "Special Sauce leads with dark berry over a damp earth base and a faint citrus lift behind it. Myrcene, beta-caryophyllene and limonene lead the terpene notes. The buds are deep green with purple flecks and break into even pieces by hand.",
  },
  {
    slug: "suver-haze-hemp-flower",
    name: "Suver Haze hemp flower",
    strain: "Suver Haze",
    key: "SUVER",
    cbdPercent: 18,
    baseCents: 2800,
    photo: "suver-haze-hemp-flower.jpg",
    aroma: "sweet fruit and pine",
    intro:
      "Suver Haze is sweet fruit first, with pine underneath and a resinous finish. Myrcene and pinene lead the terpene notes. The buds are long tapered spears, pale green and lightly frosted along the tips.",
  },
  {
    slug: "hawaiian-haze-hemp-flower",
    name: "Hawaiian Haze hemp flower",
    strain: "Hawaiian Haze",
    key: "HAWAIIAN",
    cbdPercent: 15,
    baseCents: 2400,
    photo: "hawaiian-haze-hemp-flower.jpg",
    aroma: "pineapple and citrus peel",
    intro:
      "Hawaiian Haze is pineapple and citrus peel with a light floral edge behind it. Terpinolene and limonene lead the terpene notes. The buds are airy and fox-tailed, pale green with plenty of orange hairs.",
  },
  {
    slug: "elektra-hemp-flower",
    name: "Elektra hemp flower",
    strain: "Elektra",
    key: "ELEKTRA",
    cbdPercent: 16,
    baseCents: 2500,
    photo: "elektra-hemp-flower.jpg",
    aroma: "sweet pine and damp earth",
    intro:
      "Elektra is sweet pine over damp earth, with a peppery note that builds as the flower is broken apart. Beta-caryophyllene and myrcene lead the terpene notes. The buds are chunky and tight, dark green under a layer of rust-coloured hairs.",
  },
  {
    slug: "cherry-wine-hemp-flower",
    name: "Cherry Wine hemp flower",
    strain: "Cherry Wine",
    key: "CHERRY",
    cbdPercent: 15,
    baseCents: 2400,
    photo: "cherry-wine-hemp-flower.jpg",
    aroma: "dark cherry and cracked pepper",
    intro:
      "Cherry Wine is dark cherry and cracked pepper, sweet at first and sharper as the jar warms in the hand. Myrcene and beta-caryophyllene lead the terpene notes. The calyxes carry a deep purple tint over green and stack along a tapered bud.",
  },
  {
    slug: "sour-space-candy-hemp-flower",
    name: "Sour Space Candy hemp flower",
    strain: "Sour Space Candy",
    key: "SOURSPACE",
    cbdPercent: 17,
    baseCents: 2600,
    photo: "sour-space-candy-hemp-flower.jpg",
    aroma: "sour apple and hard candy",
    intro:
      "Sour Space Candy is sour apple over a hard candy sweetness, with a tart finish. Myrcene and pinene lead the terpene notes. The buds are frosty and pale green, rounded and easy to break by hand.",
  },
  {
    slug: "bubba-kush-cbd-hemp-flower",
    name: "Bubba Kush CBD hemp flower",
    strain: "Bubba",
    key: "BUBBA",
    cbdPercent: 14,
    baseCents: 2200,
    photo: "bubba-kush-cbd-hemp-flower.jpg",
    aroma: "cocoa, coffee and earth",
    intro:
      "Bubba leads with cocoa and coffee over a deep earth base, with a faint sweetness sitting behind it. Beta-caryophyllene and limonene lead the terpene notes. The buds are compact and dark green with purple showing through, and they are denser than they look.",
  },
  {
    slug: "umpqua-hemp-flower",
    name: "Umpqua hemp flower",
    strain: "Umpqua",
    key: "UMPQUA",
    cbdPercent: 15,
    baseCents: 2300,
    photo: "umpqua-hemp-flower.jpg",
    aroma: "lemon peel and fresh pine",
    intro:
      "Umpqua is lemon peel over fresh pine, with a faint sweetness that shows once the jar is open. Pinene and limonene lead the terpene notes. The buds are broad and lumpy, mid to olive green under a light frost, with thin rust-orange hairs throughout and a short pale stem left on.",
  },
  {
    slug: "sour-lifter-hemp-flower",
    name: "Sour Lifter hemp flower",
    strain: "Sour Lifter",
    key: "SOURLIFTER",
    cbdPercent: 17,
    baseCents: 2600,
    photo: "sour-lifter-hemp-flower.jpg",
    aroma: "sour citrus and cheese rind",
    intro:
      "Sour Lifter is sour citrus first, with a cheese rind note underneath that comes from its Lifter side. Limonene and myrcene lead the terpene notes. The buds form wide, loose clusters in green and darker green, packed with rust-orange hairs and trimmed back to a short cut stem.",
  },
  {
    slug: "berry-blossom-hemp-flower",
    name: "Berry Blossom hemp flower",
    strain: "Berry Blossom",
    key: "BERRYBLOSSOM",
    cbdPercent: 15,
    baseCents: 2400,
    photo: "berry-blossom-hemp-flower.jpg",
    aroma: "ripe berry and cut grass",
    intro:
      "Berry Blossom leads with ripe berry over a cut-grass base and a faint peppery finish. Myrcene and beta-caryophyllene lead the terpene notes. The buds are compact and tapered, dark green with a grey-violet cast under a heavy frost, and threaded with orange hairs.",
  },
  {
    slug: "sour-tsunami-hemp-flower",
    name: "Sour Tsunami hemp flower",
    strain: "Sour Tsunami",
    key: "TSUNAMI",
    cbdPercent: 13,
    baseCents: 2100,
    photo: "sour-tsunami-hemp-flower.jpg",
    aroma: "sour lemon and damp earth",
    intro:
      "Sour Tsunami is sour lemon over damp earth, with a plain, grassy finish. Myrcene and pinene lead the terpene notes. The buds are broad, smooth and rounded, often in two lobes, a muted pale sage green with short peach-coloured hairs and a dry look.",
  },
  {
    slug: "carolina-dream-hemp-flower",
    name: "Carolina Dream hemp flower",
    strain: "Carolina Dream",
    key: "CAROLINA",
    cbdPercent: 14,
    baseCents: 2200,
    photo: "carolina-dream-hemp-flower.jpg",
    aroma: "sweet melon and citrus",
    intro:
      "Carolina Dream is sweet melon with a citrus edge and a light floral note behind it. Terpinolene and limonene lead the terpene notes. The buds are rounded and pale green under a light frost, almost covered by bright orange hairs that give them a warm colour.",
  },
  {
    slug: "abacus-hemp-flower",
    name: "Abacus hemp flower",
    strain: "Abacus",
    key: "ABACUS",
    cbdPercent: 16,
    baseCents: 2500,
    photo: "abacus-hemp-flower.jpg",
    aroma: "dark fruit and black pepper",
    intro:
      "Abacus is dark fruit over black pepper, resinous and a little musty as it is broken apart. Beta-caryophyllene and myrcene lead the terpene notes. The buds are long and dense, dark green to near black with purple-grey tints, under a heavy frost and a thick layer of orange hairs.",
  },
  {
    slug: "cherry-blossom-hemp-flower",
    name: "Cherry Blossom hemp flower",
    strain: "Cherry Blossom",
    key: "CHERRYBLOSSOM",
    cbdPercent: 15,
    baseCents: 2400,
    photo: "cherry-blossom-hemp-flower.jpg",
    aroma: "cherry skin and almond",
    intro:
      "Cherry Blossom is cherry skin and almond, sweet at the front with a dry finish. Myrcene and beta-caryophyllene lead the terpene notes. The buds are chunky and irregular, a dusky purple-grey under a thick frost, with long orange hairs curling out from the surface.",
  },
  {
    slug: "baox-hemp-flower",
    name: "BaOx hemp flower",
    strain: "BaOx",
    key: "BAOX",
    cbdPercent: 13,
    baseCents: 2000,
    photo: "baox-hemp-flower.jpg",
    aroma: "hay and mild citrus",
    intro:
      "BaOx is hay and mild citrus, the plainest of the strains we stock and the closest to a field variety. Myrcene leads the terpene notes with a little pinene behind it. The buds are pale olive and tan with brownish hairs and a dry look, and they come on a thick woody stem.",
  },
  {
    slug: "cherry-cobbler-hemp-flower",
    name: "Cherry Cobbler hemp flower",
    strain: "Cherry Cobbler",
    key: "COBBLER",
    cbdPercent: 18,
    baseCents: 2800,
    photo: "cherry-cobbler-hemp-flower.jpg",
    aroma: "baked cherry and vanilla",
    intro:
      "Cherry Cobbler is baked cherry over vanilla, sweeter than Cherry Wine and heavier on the finish. Myrcene, limonene and beta-caryophyllene lead the terpene notes. The buds are tall, rounded and dense, mid green with curled calyxes, rust-coloured hairs in clumps and patches of dark purple-grey.",
  },
  {
    slug: "otto-ii-hemp-flower",
    name: "Otto II hemp flower",
    strain: "Otto II",
    key: "OTTO",
    cbdPercent: 19,
    baseCents: 3000,
    photo: "otto-ii-hemp-flower.jpg",
    aroma: "pine resin and lemon zest",
    intro:
      "Otto II is pine resin with lemon zest over it, sharp and clean rather than sweet. Pinene and limonene lead the terpene notes. The buds grow as several knobbly, rounded sections along one long pale stem, sage to mid green with orange hairs scattered through them.",
  },
  {
    slug: "the-wife-hemp-flower",
    name: "The Wife hemp flower",
    strain: "The Wife",
    key: "WIFE",
    cbdPercent: 16,
    baseCents: 2500,
    photo: "the-wife-hemp-flower.jpg",
    aroma: "sweet citrus and pine",
    intro:
      "The Wife is sweet citrus over pine, light and even from the first time the jar is opened. Limonene and pinene lead the terpene notes. The buds are large frosted cones in a pale silver-green, with yellow-orange hairs and small sugar leaf tips showing at the edges.",
  },
  {
    slug: "suzy-q-hemp-flower",
    name: "Suzy Q hemp flower",
    strain: "Suzy Q",
    key: "SUZYQ",
    cbdPercent: 14,
    baseCents: 2200,
    photo: "suzy-q-hemp-flower.jpg",
    aroma: "warm hay and cedar",
    intro:
      "Suzy Q is warm hay and cedar, dry and plain with almost no sweetness to it. Myrcene and beta-caryophyllene lead the terpene notes. The buds are almost round and pale sage green, wrapped in long, loose tan hairs that curl across the surface.",
  },
  {
    slug: "harlequin-hemp-flower",
    name: "Harlequin hemp flower",
    strain: "Harlequin",
    key: "HARLEQUIN",
    cbdPercent: 15,
    baseCents: 2400,
    photo: "harlequin-hemp-flower.jpg",
    aroma: "ripe mango and damp earth",
    intro:
      "Harlequin is ripe mango over damp earth, one of the older names in CBD growing and still one of the most recognisable. Myrcene and pinene lead the terpene notes. The buds are broad and low, mid to darker green with sparse orange hairs, and some keep a trimmed leaf and stem at one end.",
  },
  {
    slug: "ringos-gift-hemp-flower",
    name: "Ringo's Gift hemp flower",
    strain: "Ringo's Gift",
    key: "RINGOS",
    cbdPercent: 17,
    baseCents: 2600,
    photo: "ringos-gift-hemp-flower.jpg",
    aroma: "sweet pine and orange peel",
    intro:
      "Ringo's Gift is sweet pine with orange peel behind it, named for the grower who bred its parents. Pinene, myrcene and limonene lead the terpene notes. The buds are cone-shaped and pale lime green, tapering to a point, under a heavy frost with short yellow-orange hairs.",
  },
  {
    slug: "harle-tsu-hemp-flower",
    name: "Harle-Tsu hemp flower",
    strain: "Harle-Tsu",
    key: "HARLETSU",
    cbdPercent: 16,
    baseCents: 2500,
    photo: "harle-tsu-hemp-flower.jpg",
    aroma: "red berry and cedar",
    intro:
      "Harle-Tsu is red berry over cedar, a cross of Harlequin and Sour Tsunami and drier than either. Myrcene and beta-caryophyllene lead the terpene notes. The buds are long and pale sage green with darker flecks, under a silvery frost with orange hairs and a thin stem at one end.",
  },
];

/** One variant per jar size, smallest first; the legend reads "Size". */
function flowerVariants(baseCents: number): ProductSeed["variants"] {
  return JAR_SIZES.map((size) => ({
    key: size.key,
    name: size.name,
    priceCents: jarPriceCents(baseCents, size),
    inventory: size.stock,
  }));
}

export const hempFlowerSeeds: ProductSeed[] = flowerRows.map((row, index) => ({
  slug: row.slug,
  name: row.name,
  sku: `HB-FLW-${row.key}`,
  category: "hemp-flower",
  images: [{ file: row.photo, alt: FLOWER_PHOTOS[row.photo] }],
  shortDescription: `Hand-trimmed ${row.strain} CBD hemp flower with a ${row.aroma} aroma, in ${JAR_RANGE} jars.`,
  description: [row.intro, curingParagraph(row.cbdPercent)],
  variants: flowerVariants(row.baseCents),
  specs: {
    strengthMg: strengthMgFor(row.cbdPercent),
    spectrum: "full",
    labTested: true,
    servingSize: "as needed",
    ingredients: ["hemp flower"],
  },
  inventory: FLOWER_INVENTORY,
  createdAt: seedDate("2026-04-03", index * 3),
}));
