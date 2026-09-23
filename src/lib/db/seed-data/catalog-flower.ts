/**
 * Hemp flower strains: eight CBD hemp flower products sold by the jar, each
 * with one own photo (`images`) instead of a gallery from the shared photo
 * pools. Photos stand for the strain, not the batch; sources are listed in
 * `docs/image-credits.md`. Copy is ours. CBD figures and terpene notes are
 * placeholders in the shape of a lab report and must be replaced with real
 * batch values before launch. See
 * `docs/superpowers/specs/2026-09-22-hemp-flower-design.md`.
 */
import type { ProductSeed } from "./catalog";
import { seedDate } from "./catalog-brands";

/** Grams in the smallest jar; `strengthMg` is the CBD it holds. */
const BASE_GRAMS = 3.5;

const FLOWER_INVENTORY = 24;

interface FlowerRow {
  slug: string;
  name: string;
  /** SKU suffix: `HB-FLW-<key>`. */
  key: string;
  /** CBD by weight from the lab report; drives `specs.strengthMg`. */
  cbdPercent: number;
  /** Prices in cents for 3.5 g, 7 g, 14 g and 28 g, in that order. */
  prices: [number, number, number, number];
  alt: string;
  shortDescription: string;
  description: [string, string];
}

const flowerRows: FlowerRow[] = [
  {
    slug: "lifter-hemp-flower",
    name: "Lifter hemp flower",
    key: "LIFTER",
    cbdPercent: 16,
    prices: [2500, 4500, 8000, 13500],
    alt: "Dried flower buds in a small stack, lime green with orange hairs, on a pale grey background",
    shortDescription:
      "Hand-trimmed Lifter CBD hemp flower with a sharp cheese and citrus aroma, in 3.5 g to 28 g jars.",
    description: [
      "Lifter opens with a sharp cheese and fuel note over a citrus edge that carries as soon as the jar is open. Myrcene and beta-caryophyllene sit at the top of the terpene notes. The buds are dense and medium sized in a pale lime green, with rust-coloured hairs running through them.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 16% CBD, roughly 560 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
  {
    slug: "special-sauce-hemp-flower",
    name: "Special Sauce hemp flower",
    key: "SAUCE",
    cbdPercent: 17,
    prices: [2700, 4800, 8500, 14500],
    alt: "Dried flower buds, one dark green bud with a short stem on a white background",
    shortDescription:
      "Hand-trimmed Special Sauce CBD hemp flower with a dark berry and earth aroma, in 3.5 g to 28 g jars.",
    description: [
      "Special Sauce leads with dark berry over a damp earth base and a faint citrus lift behind it. Myrcene, beta-caryophyllene and limonene lead the terpene notes. The buds are deep green with purple flecks and break into even pieces by hand.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 17% CBD, roughly 595 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
  {
    slug: "suver-haze-hemp-flower",
    name: "Suver Haze hemp flower",
    key: "SUVER",
    cbdPercent: 18,
    prices: [2800, 5000, 9000, 15000],
    alt: "Dried flower buds, two pale green tapered buds side by side on a white background",
    shortDescription:
      "Hand-trimmed Suver Haze CBD hemp flower with a sweet fruit and pine aroma, in 3.5 g to 28 g jars.",
    description: [
      "Suver Haze is sweet fruit first, with pine underneath and a resinous finish. Myrcene and pinene lead the terpene notes. The buds are long tapered spears, pale green and lightly frosted along the tips.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 18% CBD, roughly 630 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
  {
    slug: "hawaiian-haze-hemp-flower",
    name: "Hawaiian Haze hemp flower",
    key: "HAWAIIAN",
    cbdPercent: 15,
    prices: [2400, 4400, 7800, 13000],
    alt: "Dried flower buds, several loose pale green buds with orange hairs on a white background",
    shortDescription:
      "Hand-trimmed Hawaiian Haze CBD hemp flower with a pineapple and citrus peel aroma, in 3.5 g to 28 g jars.",
    description: [
      "Hawaiian Haze is pineapple and citrus peel with a light floral edge behind it. Terpinolene and limonene lead the terpene notes. The buds are airy and fox-tailed, pale green with plenty of orange hairs.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 15% CBD, roughly 525 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
  {
    slug: "elektra-hemp-flower",
    name: "Elektra hemp flower",
    key: "ELEKTRA",
    cbdPercent: 16,
    prices: [2500, 4500, 8000, 13500],
    alt: "Dried flower buds in close-up, a green bud with rust-coloured hairs against a dark grey background",
    shortDescription:
      "Hand-trimmed Elektra CBD hemp flower with a sweet pine and damp earth aroma, in 3.5 g to 28 g jars.",
    description: [
      "Elektra is sweet pine over damp earth, with a peppery note that builds as the flower is broken apart. Beta-caryophyllene and myrcene lead the terpene notes. The buds are chunky and tight, dark green under a layer of rust-coloured hairs.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 16% CBD, roughly 560 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
  {
    slug: "cherry-wine-hemp-flower",
    name: "Cherry Wine hemp flower",
    key: "CHERRY",
    cbdPercent: 15,
    prices: [2400, 4400, 7800, 13000],
    alt: "Dried flower buds, one long deep purple bud on a white reflective surface",
    shortDescription:
      "Hand-trimmed Cherry Wine CBD hemp flower with a dark cherry and cracked pepper aroma, in 3.5 g to 28 g jars.",
    description: [
      "Cherry Wine is dark cherry and cracked pepper, sweet at first and sharper as the jar warms in the hand. Myrcene and beta-caryophyllene lead the terpene notes. The calyxes carry a deep purple tint over green and stack along a tapered bud.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 15% CBD, roughly 525 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
  {
    slug: "sour-space-candy-hemp-flower",
    name: "Sour Space Candy hemp flower",
    key: "SOURSPACE",
    cbdPercent: 17,
    prices: [2600, 4700, 8400, 14000],
    alt: "Dried flower buds, two pale tan and green buds resting against each other on a white background",
    shortDescription:
      "Hand-trimmed Sour Space Candy CBD hemp flower with a sour apple and hard candy aroma, in 3.5 g to 28 g jars.",
    description: [
      "Sour Space Candy is sour apple over a hard candy sweetness, with a tart finish. Myrcene and pinene lead the terpene notes. The buds are frosty and pale green, rounded and easy to break by hand.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 17% CBD, roughly 595 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
  {
    slug: "bubba-kush-cbd-hemp-flower",
    name: "Bubba Kush CBD hemp flower",
    key: "BUBBA",
    cbdPercent: 14,
    prices: [2200, 4000, 7200, 12000],
    alt: "Dried flower buds, two dense green buds with rust-coloured hairs on a glossy white surface",
    shortDescription:
      "Hand-trimmed Bubba CBD hemp flower with a cocoa, coffee and earth aroma, in 3.5 g to 28 g jars.",
    description: [
      "Bubba leads with cocoa and coffee over a deep earth base, with a faint sweetness sitting behind it. Beta-caryophyllene and limonene lead the terpene notes. The buds are compact and dark green with purple showing through, and they are denser than they look.",
      "Each jar is trimmed by hand, dried slowly and then cured in glass for three to four weeks. The flower is grown on licensed farms in Oregon. The lab report for this batch reads about 14% CBD, roughly 490 mg per 3.5 g, and the batch number is printed on the lid. The glass jar ships with a two-way humidity pack.",
    ],
  },
];

/** The four jar sizes, smallest first; the legend reads "Size". */
function flowerVariants(prices: FlowerRow["prices"]): ProductSeed["variants"] {
  const [g35, g7, g14, g28] = prices;
  return [
    { key: "3-5g", name: "3.5 g", priceCents: g35 },
    { key: "7g", name: "7 g", priceCents: g7 },
    { key: "14g", name: "14 g", priceCents: g14 },
    { key: "28g", name: "28 g", priceCents: g28 },
  ];
}

export const hempFlowerSeeds: ProductSeed[] = flowerRows.map((row, index) => ({
  slug: row.slug,
  name: row.name,
  sku: `HB-FLW-${row.key}`,
  category: "hemp-flower",
  images: [{ file: `${row.slug}.jpg`, alt: row.alt }],
  shortDescription: row.shortDescription,
  description: row.description,
  variants: flowerVariants(row.prices),
  specs: {
    strengthMg: (BASE_GRAMS * 1000 * row.cbdPercent) / 100,
    spectrum: "full",
    labTested: true,
    servingSize: "as needed",
    ingredients: ["hemp flower"],
  },
  inventory: FLOWER_INVENTORY,
  createdAt: seedDate("2026-04-03", index * 3),
}));
