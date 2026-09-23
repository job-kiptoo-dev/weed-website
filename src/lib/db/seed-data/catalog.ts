/**
 * Seed catalog: every category, product, image, variant and review, with
 * stable ids (`cat_<slug>`, `prod_<slug>`, `var_<slug>-<key>`) so existing
 * localStorage carts and wishlists keep resolving. Read by the database seed
 * (`src/lib/db/seed/insert.ts`); nothing at runtime imports it once the
 * services query Postgres.
 */
import type {
  Category,
  Product,
  ProductImage,
  ProductSpecs,
  ProductStatus,
  ProductVariant,
  Review,
} from "@/types/catalog";
import {
  HEMP_FLOWER_CATEGORY,
  HEMP_PRE_ROLLS_CATEGORY,
} from "@/lib/catalog-visibility";
import { brandTinctureSeeds, glasswareSeeds } from "./catalog-brands";
import { hempFlowerSeeds } from "./catalog-flower";

const IMAGE_COUNT = 3;

function categoryImage(slug: string): string {
  return `/images/categories/${slug}.jpg`;
}

export interface PoolPhoto {
  file: string;
  alt: string;
}

/**
 * Self-hosted product photos, keyed by category slug. A product with a
 * `photo` index gets a gallery that starts there and wraps around the pool;
 * products with their own `images` skip the pools. Sources and licences are
 * listed in `docs/image-credits.md`.
 */
const photoPools: Record<string, PoolPhoto[]> = {
  tinctures: [
    {
      file: "amber-dropper-bottle.jpg",
      alt: "Amber glass dropper bottle with a blank kraft label on a white background",
    },
    {
      file: "dropper-bottle-wood-shelf.jpg",
      alt: "Amber dropper bottle with a kraft label standing on a wooden shelf",
    },
    {
      file: "glass-bottle-lavender.jpg",
      alt: "Small corked glass bottle of oil beside dried lavender sprigs",
    },
    {
      file: "herb-vials-burlap.jpg",
      alt: "Two corked glass vials, one holding a green herb sprig, on burlap with small wildflowers",
    },
    {
      file: "hemp-leaf.jpg",
      alt: "A single green hemp fan leaf on a white background",
    },
  ],
  "gummies-edibles": [
    {
      file: "gummy-bears.jpg",
      alt: "Close-up of a pile of colourful gummy bears",
    },
    {
      file: "sugared-gummies.jpg",
      alt: "Sugar-coated two-tone gummies scattered on a white surface",
    },
    {
      file: "dark-chocolate.jpg",
      alt: "Squares of dark chocolate with chocolate shavings on a white background",
    },
    {
      file: "honey-dipper.jpg",
      alt: "Wooden honey dipper resting in a ceramic pot of dark honey",
    },
    {
      file: "jelly-candies.jpg",
      alt: "A small heap of mixed fruit jelly candies on a pale background",
    },
  ],
  topicals: [
    {
      file: "balm-jar.jpg",
      alt: "Open white jar of pink balm on a light background",
    },
    {
      file: "lotion-pump.jpg",
      alt: "Lotion pump bottle with a gold collar beside white flowers",
    },
    {
      file: "bath-soak.jpg",
      alt: "Bath bombs, a folded towel, a wooden bowl of bath salt and a small candle on a wooden counter",
    },
    {
      file: "balm-in-hand.jpg",
      alt: "Hands holding a small open pot of pink balm",
    },
    {
      file: "bath-salt-bowl.jpg",
      alt: "White bowl of bath salt with a wooden scoop",
    },
  ],
  "teas-wellness": [
    {
      file: "chamomile-tea.jpg",
      alt: "Glass cup of tea with fresh chamomile flowers floating on top",
    },
    {
      file: "mint-tea.jpg",
      alt: "Glass cup of tea with a mint sprig and lemon slice beside a pyramid tea bag",
    },
    {
      file: "matcha.jpg",
      alt: "Wooden cup of matcha powder next to a bamboo whisk on a dark table",
    },
    {
      file: "softgels.jpg",
      alt: "Golden softgels spilling from a small glass jar onto a white surface",
    },
    {
      file: "cocoa-cup.jpg",
      alt: "White cup of hot cocoa topped with whipped cream on a saucer",
    },
  ],
  accessories: [
    {
      file: "lighter.jpg",
      alt: "Brushed chrome flip-top lighter standing on a pale grey background",
    },
    {
      file: "grinder.jpg",
      alt: "Brushed brass four-piece herb grinder, open at the top to show the teeth and ground herbs",
    },
    {
      file: "rolling-papers.jpg",
      alt: "Several unbleached brown paper cones lying on a dark star-print cloth",
    },
    {
      file: "rolling-tray.jpg",
      alt: "Rectangular wooden tray with a bamboo-style gallery rail on a pale background",
    },
    {
      file: "glass-jar.jpg",
      alt: "Clear glass jars with wire clamp lids and rubber seals, tied with red gingham ribbon",
    },
    {
      file: "ashtray.jpg",
      alt: "Shallow pale green glazed ceramic dish on a grey background",
    },
    {
      file: "glass-bottles.jpg",
      alt: "Empty glass jar and a small wooden-capped bottle of oil on a grey table",
    },
  ],
  "hemp-pre-rolls": [
    {
      file: "pre-roll-single.jpg",
      alt: "A single unlit pre-rolled cone with a pale blue tip standing on a yellow surface against a blue wall",
    },
    {
      file: "pre-roll-pack.jpg",
      alt: "A loose pile of unlit pre-rolled cones on a dark star-print cloth",
    },
    {
      file: "pre-roll-duo.jpg",
      alt: "Close-up of an unlit pre-rolled cone, its open end packed with dried flower, on a dark surface",
    },
  ],
};

function productImage(
  category: string,
  photo: number,
  n: number,
): { url: string; alt: string } {
  const pool = photoPools[category];
  const picked = pool?.[(photo + n - 1) % pool.length];
  if (!pool || !picked) {
    throw new Error(`Seed catalog: no photo pool for category "${category}"`);
  }
  return {
    url: `/images/products/${category}/${picked.file}`,
    alt: picked.alt,
  };
}

interface CategorySeed {
  slug: string;
  name: string;
  description: string;
}

const categorySeeds: CategorySeed[] = [
  {
    slug: "tinctures",
    name: "Tinctures",
    description:
      "Oils and drops in amber glass bottles with a marked dropper, labeled by strength and spectrum.",
  },
  {
    slug: "gummies-edibles",
    name: "Gummies & Edibles",
    description:
      "Gummies, chocolate and honey straws with a set amount per piece, packed in resealable pouches and tins.",
  },
  {
    slug: "topicals",
    name: "Topicals",
    description:
      "Balms, creams, lotions and soaks made with plant oils and butters, in jars, tubes and pumps.",
  },
  {
    slug: "teas-wellness",
    name: "Teas & Wellness",
    description:
      "Tea sachets, powders and softgels with a set amount per serving, sealed for freshness.",
  },
  {
    slug: "accessories",
    name: "Accessories",
    description:
      "Lighters, grinders, papers and cones, trays, smell-proof jars and ashtrays. No nicotine, no tobacco.",
  },
  {
    slug: HEMP_PRE_ROLLS_CATEGORY,
    name: "Hemp pre-rolls",
    description:
      "Pre-rolled CBD hemp flower in unbleached cones with card tips. Lab tested every batch. Not available in every state.",
  },
  {
    slug: HEMP_FLOWER_CATEGORY,
    name: "Hemp flower",
    description:
      "Whole CBD hemp flower by the strain, hand trimmed and slow cured, in 3.5 g to 28 g jars. Lab tested every batch. Not available in every state.",
  },
  {
    slug: "glassware",
    name: "Glassware",
    description:
      "Borosilicate beakers, water pipes, bubblers and hand pipes, plus silicone pieces, quartz bangers and a gravity infuser.",
  },
];

interface VariantSeed {
  /** Used in the variant id and sku: `var_<slug>-<key>`, `<SKU>-<key>`. */
  key: string;
  name: string;
  priceCents: number;
  inventory?: number;
}

export interface ProductSeed {
  slug: string;
  name: string;
  sku: string;
  category: string;
  /**
   * Index into `photoPools[category]` for the primary (first) image. Set
   * exactly one of `photo` and `images`.
   */
  photo?: number;
  /** The product's own photos, in `/images/products/<category>/`. */
  images?: PoolPhoto[];
  shortDescription: string;
  description: [string, string];
  variants: VariantSeed[];
  specs: ProductSpecs | null;
  compareAtPriceCents?: number;
  featured?: boolean;
  inventory?: number;
  status?: ProductStatus;
  createdAt: string;
}

const DEFAULT_INVENTORY = 40;

// Invariant: for products whose variants are named "<n> mg", `specs.strengthMg` must equal the default (first) variant's strength.
const productSeeds: ProductSeed[] = [
  {
    slug: "calm-full-spectrum-oil",
    name: "House blend full-spectrum oil",
    sku: "HB-TIN-CALM",
    category: "tinctures",
    photo: 0,
    shortDescription:
      "Full-spectrum hemp extract in MCT oil with a light, earthy taste. Amber glass bottle with a marked dropper.",
    description: [
      "A full-spectrum hemp extract blended into MCT oil. The taste is mild and earthy with a slightly grassy finish, and the oil is thin enough to measure cleanly with the dropper. Each bottle holds 30 mL.",
      "The dropper is marked at 0.25 mL steps so a serving is easy to read. Every batch is tested by an independent lab and the batch number is printed on the base of the bottle.",
    ],
    variants: [
      { key: "500", name: "500 mg", priceCents: 3900 },
      { key: "1000", name: "1000 mg", priceCents: 6400 },
      { key: "2000", name: "2000 mg", priceCents: 10900 },
    ],
    specs: {
      strengthMg: 500,
      spectrum: "full",
      labTested: true,
      servingSize: "1 mL",
      ingredients: ["MCT oil", "full-spectrum hemp extract"],
    },
    featured: true,
    createdAt: "2025-01-06T10:00:00.000Z",
  },
  {
    slug: "daily-broad-spectrum-drops",
    name: "Daily driver drops",
    sku: "HB-TIN-DAILY",
    category: "tinctures",
    photo: 1,
    shortDescription:
      "Broad-spectrum drops in MCT oil with a faint citrus note. Clear label, marked dropper, 30 mL bottle.",
    description: [
      "Broad-spectrum hemp extract in MCT oil with a small amount of orange oil for a faint citrus note. The texture is light and it mixes easily into a glass of water or a cup of tea.",
      "Comes in a 30 mL amber bottle with a graduated glass dropper. The label lists strength, spectrum and batch number, and the lab report for each batch is available on request.",
    ],
    variants: [
      { key: "500", name: "500 mg", priceCents: 3600 },
      { key: "1000", name: "1000 mg", priceCents: 5900 },
      { key: "2000", name: "2000 mg", priceCents: 9900 },
    ],
    specs: {
      strengthMg: 500,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 mL",
      ingredients: ["MCT oil", "broad-spectrum hemp extract", "orange oil"],
    },
    featured: true,
    createdAt: "2025-01-17T10:00:00.000Z",
  },
  {
    slug: "evening-cbd-cbn-drops",
    name: "Night shift CBN drops",
    sku: "HB-TIN-EVE",
    category: "tinctures",
    photo: 1,
    shortDescription:
      "Broad-spectrum CBD with added CBN in MCT oil. Lavender and vanilla taste, 30 mL amber bottle.",
    description: [
      "A broad-spectrum hemp extract with added CBN, blended into MCT oil with a touch of lavender and vanilla. The taste is soft and floral and the oil is smooth on the tongue.",
      "Packaged in a 30 mL amber glass bottle with a marked dropper and a tamper band on the cap. Each batch is lab tested and the CBD and CBN content per mL is printed on the label.",
    ],
    variants: [
      { key: "750", name: "750 mg", priceCents: 5400 },
      { key: "1500", name: "1500 mg", priceCents: 8900 },
    ],
    specs: {
      strengthMg: 750,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 mL",
      ingredients: [
        "MCT oil",
        "broad-spectrum hemp extract",
        "CBN",
        "lavender oil",
      ],
    },
    createdAt: "2025-01-28T10:00:00.000Z",
  },
  {
    slug: "mint-isolate-tincture",
    name: "Cool mint isolate",
    sku: "HB-TIN-MINT",
    category: "tinctures",
    photo: 3,
    shortDescription:
      "CBD isolate in MCT oil with a clean peppermint taste. No hemp flavor, 30 mL bottle with dropper.",
    description: [
      "CBD isolate dissolved in MCT oil with peppermint oil. Because it uses isolate there is no hemp taste at all, only a clean mint finish. The oil is clear and thin.",
      "Ships in a 30 mL amber bottle with a graduated dropper. The isolate is tested for purity by an independent lab and the batch number is printed on the label.",
    ],
    variants: [
      { key: "1000", name: "1000 mg", priceCents: 4900 },
      { key: "2000", name: "2000 mg", priceCents: 8400 },
    ],
    specs: {
      strengthMg: 1000,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 mL",
      ingredients: ["MCT oil", "CBD isolate", "peppermint oil"],
    },
    compareAtPriceCents: 5900,
    createdAt: "2025-02-08T10:00:00.000Z",
  },
  {
    slug: "citrus-full-spectrum-oil",
    name: "Citrus crush oil",
    sku: "HB-TIN-CITRUS",
    category: "tinctures",
    photo: 2,
    shortDescription:
      "Full-spectrum hemp extract in MCT oil with orange and lemon oils. Bright taste, 30 mL amber bottle.",
    description: [
      "Full-spectrum hemp extract in MCT oil with cold-pressed orange and lemon oils. The citrus covers most of the hemp taste and leaves a bright, slightly sweet finish.",
      "The 30 mL amber bottle has a graduated dropper and a child-resistant cap. Each batch is tested by an independent lab, and the report is available on request.",
    ],
    variants: [
      { key: "1000", name: "1000 mg", priceCents: 6400 },
      { key: "2000", name: "2000 mg", priceCents: 10900 },
    ],
    specs: {
      strengthMg: 1000,
      spectrum: "full",
      labTested: true,
      servingSize: "1 mL",
      ingredients: [
        "MCT oil",
        "full-spectrum hemp extract",
        "orange oil",
        "lemon oil",
      ],
    },
    createdAt: "2025-02-19T10:00:00.000Z",
  },
  {
    slug: "unflavored-isolate-oil",
    name: "Straight-up isolate oil",
    sku: "HB-TIN-PLAIN",
    category: "tinctures",
    photo: 0,
    shortDescription:
      "CBD isolate in MCT oil with nothing else added. Neutral taste, 30 mL amber bottle with dropper.",
    description: [
      "Two ingredients: CBD isolate and MCT oil. It has almost no taste, so it disappears into coffee, smoothies or salad dressing without changing the flavor.",
      "Comes in a 30 mL amber bottle with a graduated dropper. Every batch is lab tested for purity and the batch number is printed on the base of the bottle.",
    ],
    variants: [
      { key: "500", name: "500 mg", priceCents: 2900, inventory: 0 },
      { key: "1000", name: "1000 mg", priceCents: 4600, inventory: 0 },
    ],
    specs: {
      strengthMg: 500,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 mL",
      ingredients: ["MCT oil", "CBD isolate"],
    },
    inventory: 0,
    createdAt: "2025-03-02T10:00:00.000Z",
  },
  {
    slug: "mixed-berry-gummies",
    name: "Berry bomb gummies",
    sku: "HB-GUM-BERRY",
    category: "gummies-edibles",
    photo: 0,
    shortDescription:
      "Soft pectin gummies in strawberry, raspberry and blueberry. Broad-spectrum, 30 per resealable pouch.",
    description: [
      "Pectin-based gummies in three berry flavors, made with real fruit juice and cane sugar. They are soft with a light sugar coating and no gelatin.",
      "Each gummy holds the same amount of broad-spectrum hemp extract, printed on the pouch along with the batch number. The pouch reseals and keeps the gummies from drying out.",
    ],
    variants: [
      { key: "10-30", name: "10 mg, 30 count", priceCents: 3200 },
      { key: "25-30", name: "25 mg, 30 count", priceCents: 5400 },
    ],
    specs: {
      strengthMg: 10,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 gummy",
      ingredients: [
        "cane sugar",
        "pectin",
        "fruit juice",
        "broad-spectrum hemp extract",
      ],
    },
    featured: true,
    createdAt: "2025-03-13T10:00:00.000Z",
  },
  {
    slug: "citrus-isolate-gummies",
    name: "Citrus zing gummies",
    sku: "HB-GUM-CITRUS",
    category: "gummies-edibles",
    photo: 1,
    shortDescription:
      "Orange, lemon and grapefruit gummies made with CBD isolate. No hemp taste, 30 or 60 per pouch.",
    description: [
      "Citrus gummies made with CBD isolate, so there is no hemp flavor, only orange, lemon and grapefruit. They have a firm chew and a tart sugar coating.",
      "Available in a 30 count or 60 count resealable pouch. Each batch is lab tested and the amount per gummy is printed on the front of the pouch.",
    ],
    variants: [
      { key: "25-30", name: "25 mg, 30 count", priceCents: 4900 },
      { key: "25-60", name: "25 mg, 60 count", priceCents: 8900 },
    ],
    specs: {
      strengthMg: 25,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 gummy",
      ingredients: ["cane sugar", "pectin", "citrus juice", "CBD isolate"],
    },
    createdAt: "2025-03-24T10:00:00.000Z",
  },
  {
    slug: "evening-gummies",
    name: "Night shift gummies",
    sku: "HB-GUM-EVE",
    category: "gummies-edibles",
    photo: 4,
    shortDescription:
      "Blackberry gummies with broad-spectrum CBD and added CBN. Soft chew, 30 per resealable pouch.",
    description: [
      "Blackberry flavored pectin gummies with broad-spectrum hemp extract and added CBN. The flavor is deep and jammy and the texture is soft.",
      "Packed 30 to a matte pouch with a zip seal. The CBD and CBN content per gummy and the batch number are printed on the back, and the lab report is available on request.",
    ],
    variants: [{ key: "15-30", name: "15 mg, 30 count", priceCents: 4400 }],
    specs: {
      strengthMg: 15,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 gummy",
      ingredients: [
        "cane sugar",
        "pectin",
        "blackberry juice",
        "broad-spectrum hemp extract",
      ],
    },
    createdAt: "2025-04-04T10:00:00.000Z",
  },
  {
    slug: "sour-apple-gummies",
    name: "Sour apple bites",
    sku: "HB-GUM-APPLE",
    category: "gummies-edibles",
    photo: 1,
    shortDescription:
      "Green apple gummies with a sour sugar coating. Broad-spectrum, 30 per pouch.",
    description: [
      "Green apple pectin gummies rolled in a sour sugar coating. The chew is firm and the apple flavor is sharp rather than sweet.",
      "Thirty gummies in a resealable pouch, each with the same amount of broad-spectrum hemp extract. Lab tested by batch, with the batch number on the pouch.",
    ],
    variants: [{ key: "25-30", name: "25 mg, 30 count", priceCents: 4900 }],
    specs: {
      strengthMg: 25,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 gummy",
      ingredients: [
        "cane sugar",
        "pectin",
        "apple juice",
        "broad-spectrum hemp extract",
      ],
    },
    compareAtPriceCents: 5600,
    createdAt: "2025-04-15T10:00:00.000Z",
  },
  {
    slug: "honey-sticks",
    name: "Honey straws",
    sku: "HB-EDI-HONEY",
    category: "gummies-edibles",
    photo: 3,
    shortDescription:
      "Wildflower honey with CBD isolate in single-serve straws. 10 straws per box.",
    description: [
      "Raw wildflower honey with CBD isolate mixed in, sealed in single-serve straws. The honey is thick and floral and the isolate does not change the taste.",
      "Ten straws per box. Snip the end and squeeze into tea, onto toast or straight from the straw. Each batch is lab tested and the amount per straw is printed on the box.",
    ],
    variants: [{ key: "10-10", name: "10 mg, 10 count", priceCents: 1800 }],
    specs: {
      strengthMg: 10,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 straw",
      ingredients: ["wildflower honey", "CBD isolate"],
    },
    createdAt: "2025-04-26T10:00:00.000Z",
  },
  {
    slug: "dark-chocolate-squares",
    name: "Midnight chocolate squares",
    sku: "HB-EDI-CHOC",
    category: "gummies-edibles",
    photo: 2,
    shortDescription:
      "70% dark chocolate squares with broad-spectrum hemp extract. Individually wrapped, 12 or 24 per box.",
    description: [
      "Small squares of 70% dark chocolate with broad-spectrum hemp extract folded in. The chocolate snaps cleanly and has a smooth, slightly bitter finish.",
      "Each square is wrapped in foil and boxed in sets of 12 or 24. The amount per square and the batch number are printed on the box, and every batch is lab tested.",
    ],
    variants: [
      { key: "15-12", name: "15 mg, 12 count", priceCents: 2400 },
      { key: "15-24", name: "15 mg, 24 count", priceCents: 4200 },
    ],
    specs: {
      strengthMg: 15,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 square",
      ingredients: [
        "cocoa mass",
        "cane sugar",
        "cocoa butter",
        "broad-spectrum hemp extract",
      ],
    },
    featured: true,
    createdAt: "2025-05-07T10:00:00.000Z",
  },
  {
    slug: "cooling-muscle-balm",
    name: "Ice box balm",
    sku: "HB-TOP-COOL",
    category: "topicals",
    photo: 0,
    shortDescription:
      "Shea and beeswax balm with menthol and broad-spectrum hemp extract. Cooling feel, 60 mL tin.",
    description: [
      "A firm balm made from shea butter, beeswax and coconut oil with menthol and broad-spectrum hemp extract. It has a cool, minty scent and melts as you rub it in.",
      "Comes in a 60 mL screw-top tin that fits in a bag. The amount of hemp extract per tin and the batch number are printed on the lid label, and every batch is lab tested.",
    ],
    variants: [
      { key: "500", name: "500 mg", priceCents: 3400 },
      { key: "1000", name: "1000 mg", priceCents: 5600 },
    ],
    specs: {
      strengthMg: 500,
      spectrum: "broad",
      labTested: true,
      servingSize: "pea-sized amount",
      ingredients: [
        "shea butter",
        "beeswax",
        "menthol",
        "broad-spectrum hemp extract",
      ],
    },
    featured: true,
    createdAt: "2025-05-18T10:00:00.000Z",
  },
  {
    slug: "warming-body-cream",
    name: "Heat check cream",
    sku: "HB-TOP-WARM",
    category: "topicals",
    photo: 3,
    shortDescription:
      "Rich cream with ginger and cinnamon oils and full-spectrum hemp extract. Warming feel, 100 mL jar.",
    description: [
      "A thick cream with ginger and cinnamon leaf oils and full-spectrum hemp extract. It has a warm, spicy scent and absorbs within a minute or two without leaving a film.",
      "Packaged in a 100 mL glass jar with a wide mouth. The label shows the total hemp extract in the jar and the batch number; the lab report is available on request.",
    ],
    variants: [{ key: "1000", name: "1000 mg", priceCents: 4800 }],
    specs: {
      strengthMg: 1000,
      spectrum: "full",
      labTested: true,
      servingSize: "pea-sized amount",
      ingredients: [
        "shea butter",
        "ginger oil",
        "cinnamon leaf oil",
        "full-spectrum hemp extract",
      ],
    },
    createdAt: "2025-05-29T10:00:00.000Z",
  },
  {
    slug: "unscented-body-lotion",
    name: "No-frills lotion",
    sku: "HB-TOP-LOTION",
    category: "topicals",
    photo: 1,
    shortDescription:
      "Light, fragrance-free lotion with CBD isolate and jojoba oil. 200 mL pump bottle.",
    description: [
      "A light lotion with jojoba oil, aloe and CBD isolate and no added fragrance. It spreads easily and sinks in quickly, so it works well after a shower.",
      "The 200 mL pump bottle dispenses a measured amount each press. Total hemp extract and batch number are printed on the back, and each batch is lab tested.",
    ],
    variants: [
      { key: "500", name: "500 mg", priceCents: 3200 },
      { key: "1000", name: "1000 mg", priceCents: 5200 },
    ],
    specs: {
      strengthMg: 500,
      spectrum: "isolate",
      labTested: true,
      servingSize: "pump",
      ingredients: ["aloe", "jojoba oil", "CBD isolate"],
    },
    createdAt: "2025-06-09T10:00:00.000Z",
  },
  {
    slug: "lip-balm-duo",
    name: "Lip service balm duo",
    sku: "HB-TOP-LIP",
    category: "topicals",
    photo: 3,
    shortDescription:
      "Two beeswax lip balms, one vanilla and one mint, with CBD isolate. 4.5 g each.",
    description: [
      "Two lip balms in a set: vanilla and mint. Both are made from beeswax, coconut oil and CBD isolate, with a smooth glide and no waxy drag.",
      "Each tube holds 4.5 g and the pair comes in a small paper box. The hemp extract per tube and the batch number are printed on the box, and every batch is lab tested.",
    ],
    variants: [{ key: "50", name: "50 mg", priceCents: 1200 }],
    specs: {
      strengthMg: 50,
      spectrum: "isolate",
      labTested: true,
      servingSize: "as needed",
      ingredients: ["beeswax", "coconut oil", "CBD isolate"],
    },
    createdAt: "2025-06-20T10:00:00.000Z",
  },
  {
    slug: "bath-soak",
    name: "Deep end bath soak",
    sku: "HB-TOP-SOAK",
    category: "topicals",
    photo: 2,
    shortDescription:
      "Epsom salt bath soak with eucalyptus oil and CBD isolate. Scoop included, 450 g pouch.",
    description: [
      "Coarse Epsom salt blended with eucalyptus oil and CBD isolate. The salt dissolves fully in warm water and leaves a light, fresh scent in the bathroom.",
      "Comes in a 450 g stand-up pouch with a wooden scoop. The label shows the hemp extract per pouch and the batch number; every batch is lab tested.",
    ],
    variants: [{ key: "200", name: "200 mg", priceCents: 2200 }],
    specs: {
      strengthMg: 200,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 scoop",
      ingredients: ["Epsom salt", "eucalyptus oil", "CBD isolate"],
    },
    createdAt: "2025-07-01T10:00:00.000Z",
  },
  {
    slug: "roll-on-stick",
    name: "Grab-and-go roll-on",
    sku: "HB-TOP-ROLL",
    category: "topicals",
    photo: 1,
    shortDescription:
      "Twist-up balm stick with broad-spectrum hemp extract and arnica. Mess-free, 75 mL tube.",
    description: [
      "A twist-up balm in a deodorant-style tube with broad-spectrum hemp extract, arnica and a little camphor. It glides on without getting your hands greasy.",
      "The 75 mL tube has a snap-on cap and fits in a gym bag. The total hemp extract and batch number are printed on the side, and each batch is lab tested.",
    ],
    variants: [{ key: "750", name: "750 mg", priceCents: 3800 }],
    specs: {
      strengthMg: 750,
      spectrum: "broad",
      labTested: true,
      servingSize: "2 swipes",
      ingredients: [
        "shea butter",
        "beeswax",
        "arnica",
        "broad-spectrum hemp extract",
      ],
    },
    compareAtPriceCents: 4400,
    featured: true,
    createdAt: "2025-07-12T10:00:00.000Z",
  },
  {
    slug: "chamomile-evening-tea",
    name: "Late-night chamomile tea",
    sku: "HB-TEA-CHAM",
    category: "teas-wellness",
    photo: 0,
    shortDescription:
      "Chamomile and lemon balm tea sachets with water-soluble CBD isolate. 10 sachets per tin.",
    description: [
      "Whole chamomile flowers and lemon balm in biodegradable sachets, with water-soluble CBD isolate. The tea brews pale gold with a soft, honey-like taste.",
      "Ten sachets in a resealable tin. Steep for five minutes in hot water. Hemp extract per sachet and the batch number are printed on the tin, and each batch is lab tested.",
    ],
    variants: [{ key: "10", name: "10 sachets", priceCents: 2400 }],
    specs: {
      strengthMg: 20,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 sachet",
      ingredients: ["chamomile", "lemon balm", "CBD isolate"],
    },
    featured: true,
    createdAt: "2025-07-23T10:00:00.000Z",
  },
  {
    slug: "peppermint-day-tea",
    name: "Early-bird peppermint tea",
    sku: "HB-TEA-MINT",
    category: "teas-wellness",
    photo: 1,
    shortDescription:
      "Peppermint leaf tea sachets with water-soluble CBD isolate. Bright and clean, 10 sachets per tin.",
    description: [
      "Cut peppermint leaf in plant-based sachets with water-soluble CBD isolate. It brews bright and clear with a strong mint taste and no bitterness.",
      "Ten sachets in a resealable tin. Good hot or over ice. The amount of hemp extract per sachet and the batch number are printed on the tin, and each batch is lab tested.",
    ],
    variants: [{ key: "10", name: "10 sachets", priceCents: 2400 }],
    specs: {
      strengthMg: 20,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 sachet",
      ingredients: ["peppermint leaf", "CBD isolate"],
    },
    createdAt: "2025-08-03T10:00:00.000Z",
  },
  {
    slug: "ginger-lemon-tea",
    name: "Ginger zing tea",
    sku: "HB-TEA-GINGER",
    category: "teas-wellness",
    photo: 1,
    shortDescription:
      "Dried ginger and lemon peel tea sachets with broad-spectrum hemp extract. 10 sachets per tin.",
    description: [
      "Dried ginger root and lemon peel in plant-based sachets with water-soluble broad-spectrum hemp extract. The tea is warm and sharp with a citrus finish.",
      "Ten sachets in a resealable tin. Steep for five to seven minutes for a stronger cup. Hemp extract per sachet and the batch number are on the tin, and each batch is lab tested.",
    ],
    variants: [{ key: "10", name: "10 sachets", priceCents: 2400 }],
    specs: {
      strengthMg: 20,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 sachet",
      ingredients: ["ginger root", "lemon peel", "broad-spectrum hemp extract"],
    },
    createdAt: "2025-08-14T10:00:00.000Z",
  },
  {
    slug: "matcha-blend",
    name: "Green machine matcha",
    sku: "HB-TEA-MATCHA",
    category: "teas-wellness",
    photo: 2,
    shortDescription:
      "Ceremonial-grade matcha blended with CBD isolate powder. Whisk or blend, 100 g tin.",
    description: [
      "Stone-ground ceremonial-grade matcha blended with CBD isolate powder. It has a grassy, slightly sweet taste and whisks into a smooth, foamy cup.",
      "The 100 g tin has an inner seal and a measuring spoon. The hemp extract per teaspoon and the batch number are printed on the tin, and every batch is lab tested.",
    ],
    variants: [{ key: "100", name: "100 g", priceCents: 3600 }],
    specs: {
      strengthMg: 500,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 tsp",
      ingredients: ["matcha green tea", "CBD isolate"],
    },
    createdAt: "2025-08-25T10:00:00.000Z",
  },
  {
    slug: "broad-spectrum-softgels",
    name: "Pocket softgels",
    sku: "HB-WEL-SOFT",
    category: "teas-wellness",
    photo: 3,
    shortDescription:
      "Broad-spectrum hemp extract in MCT oil, sealed in small softgels. No taste, 30 or 60 per bottle.",
    description: [
      "Broad-spectrum hemp extract in MCT oil, sealed in small clear softgels. There is nothing to measure and no taste, which makes them easy to travel with.",
      "Bottled in amber glass with a child-resistant cap in counts of 30 or 60. Hemp extract per softgel and the batch number are printed on the label, and every batch is lab tested.",
    ],
    variants: [
      { key: "30", name: "30 count", priceCents: 5200 },
      { key: "60", name: "60 count", priceCents: 9400 },
    ],
    specs: {
      strengthMg: 25,
      spectrum: "broad",
      labTested: true,
      servingSize: "1 softgel",
      ingredients: ["MCT oil", "broad-spectrum hemp extract", "gelatin"],
    },
    featured: true,
    createdAt: "2025-09-05T10:00:00.000Z",
  },
  {
    slug: "hot-cocoa-mix",
    name: "After-dark cocoa",
    sku: "HB-WEL-COCOA",
    category: "teas-wellness",
    photo: 4,
    shortDescription:
      "Dutch cocoa and cane sugar mix with CBD isolate. Single-serve packets, 10 per box.",
    description: [
      "Dutch-process cocoa, cane sugar and a pinch of salt with CBD isolate powder. Stir a packet into hot milk or water for a rich, not too sweet cup.",
      "Ten single-serve packets in a paper box. Hemp extract per packet and the batch number are printed on the box, and every batch is lab tested.",
    ],
    variants: [
      { key: "10", name: "10 servings", priceCents: 2600, inventory: 0 },
    ],
    specs: {
      strengthMg: 15,
      spectrum: "isolate",
      labTested: true,
      servingSize: "1 packet",
      ingredients: ["cocoa powder", "cane sugar", "CBD isolate"],
    },
    inventory: 0,
    createdAt: "2025-09-16T10:00:00.000Z",
  },
  {
    slug: "refillable-lighter-two-pack",
    name: "Refillable lighter 2 pack",
    sku: "HB-ACC-LIGHTER",
    category: "accessories",
    photo: 0,
    shortDescription:
      "Two flip-top lighters with brushed chrome cases and a steel flint wheel. Refillable, ships empty.",
    description: [
      "Two flip-top lighters with brushed chrome cases, a hinged lid and a steel flint wheel. Each case is about 6 cm tall and slips easily into a jeans pocket.",
      "The cases take standard lighter fluid, which is not included. They ship empty, in a plain card box with a sleeve for each lighter.",
    ],
    variants: [{ key: "2-pack", name: "2 pack", priceCents: 800 }],
    specs: null,
    createdAt: "2025-09-27T10:00:00.000Z",
  },
  {
    slug: "four-piece-grinder",
    name: "Four-piece metal grinder",
    sku: "HB-ACC-GRINDER",
    category: "accessories",
    photo: 1,
    shortDescription:
      "Four-piece brass grinder with diamond-cut teeth, a fine mesh screen and a magnetic lid. 55 mm across.",
    description: [
      "A four-piece grinder machined from brass, with diamond-cut teeth, a fine stainless mesh screen and a collection chamber in the base. It measures 55 mm across and about 40 mm tall.",
      "The lid is held on by a magnet and the threads are cut clean, so each section turns smoothly. Brushed brass finish.",
    ],
    variants: [{ key: "55", name: "55 mm", priceCents: 2800 }],
    specs: null,
    featured: true,
    createdAt: "2025-10-08T10:00:00.000Z",
  },
  {
    slug: "unbleached-papers-and-cones",
    name: "Unbleached papers and cones",
    sku: "HB-ACC-PAPERS",
    category: "accessories",
    photo: 2,
    shortDescription:
      "Thin unbleached rice papers in a 50-leaf booklet, or a 6 pack of ready-rolled cones with card tips.",
    description: [
      "Thin, unbleached rice papers with a natural gum strip, in a booklet of 50 slim leaves. The paper is a light tan with no dyes or chalk added.",
      "The cones are rolled from the same unbleached paper, with a folded card tip, and come six to a tube. Each cone is 109 mm long.",
    ],
    variants: [
      { key: "papers-50", name: "Papers, 50 leaves", priceCents: 600 },
      { key: "cones-6", name: "Cones, 6 pack", priceCents: 900 },
    ],
    specs: null,
    createdAt: "2025-10-19T10:00:00.000Z",
  },
  {
    slug: "bamboo-rolling-tray",
    name: "Bamboo rolling tray",
    sku: "HB-ACC-TRAY",
    category: "accessories",
    photo: 3,
    shortDescription:
      "Solid bamboo tray with a raised lip on all four sides. Small or large, oiled natural finish.",
    description: [
      "A tray cut from solid bamboo with a raised lip on all four sides. The small tray is 18 by 14 cm and the large tray is 28 by 18 cm.",
      "Finished with a food-safe oil, with rounded corners and a smooth, sanded surface. The natural grain varies from tray to tray.",
    ],
    variants: [
      { key: "small", name: "Small", priceCents: 1900 },
      { key: "large", name: "Large", priceCents: 2600 },
    ],
    specs: null,
    createdAt: "2025-10-30T10:00:00.000Z",
  },
  {
    slug: "smell-proof-glass-jar",
    name: "Smell-proof glass jar",
    sku: "HB-ACC-JAR",
    category: "accessories",
    photo: 4,
    shortDescription:
      "Thick glass jar with a wire clamp lid and a silicone seal that keeps odor in. 100 or 250 mL.",
    description: [
      "A thick, clear glass jar with a hinged wire clamp lid and a food-grade silicone gasket that seals airtight when closed. Holds 100 mL or 250 mL.",
      "The mouth is wide enough to reach into, and the clamp and hinge are stainless steel. No labels or printing on the glass.",
    ],
    variants: [
      { key: "100", name: "100 mL", priceCents: 2200 },
      { key: "250", name: "250 mL", priceCents: 2800 },
    ],
    specs: null,
    compareAtPriceCents: 3400,
    createdAt: "2025-11-10T10:00:00.000Z",
  },
  {
    slug: "ceramic-ashtray",
    name: "Ceramic ashtray",
    sku: "HB-ACC-ASHTRAY",
    category: "accessories",
    photo: 5,
    shortDescription:
      "Heavy stoneware ashtray with a speckled sage glaze and three rest notches. 12 cm across.",
    description: [
      "A heavy stoneware ashtray with a speckled sage glaze inside and out, and three shallow rest notches around the rim. It measures 12 cm across and 3 cm deep.",
      "The base is left unglazed and sanded smooth so it sits flat without marking the table. Each one is glazed by hand, so the speckle varies a little.",
    ],
    variants: [{ key: "single", name: "One size", priceCents: 1600 }],
    specs: null,
    createdAt: "2025-11-15T10:00:00.000Z",
  },
  {
    slug: "gift-box",
    name: "Gift box",
    sku: "HB-ACC-GIFTBOX",
    category: "accessories",
    photo: 1,
    shortDescription:
      "Rigid kraft gift box with a ribbon and tissue paper. Fits two bottles or a tin and a pouch.",
    description: [
      "A rigid kraft gift box with a magnetic lid, a length of cotton ribbon and two sheets of tissue paper. It fits two 30 mL bottles or a tin and a pouch of gummies.",
      "The box ships flat-packed with the lid assembled. Folds together in about a minute.",
    ],
    variants: [{ key: "single", name: "One size", priceCents: 1200 }],
    specs: null,
    status: "archived",
    createdAt: "2025-11-21T10:00:00.000Z",
  },
  {
    slug: "classic-hemp-pre-roll",
    name: "Classic hemp pre-roll",
    sku: "HB-PRE-CLASSIC",
    category: HEMP_PRE_ROLLS_CATEGORY,
    photo: 0,
    shortDescription:
      "Full-spectrum CBD hemp flower, packed by hand into an unbleached cone with a card tip. 1 g each.",
    description: [
      "Ground CBD hemp flower packed by hand into an unbleached paper cone with a folded card tip. Each pre-roll holds 1 g of flower and comes sealed in its own glass tube.",
      "The flower is grown on licensed farms in Oregon and every batch is tested by an independent lab. The batch number is printed on each tube.",
    ],
    variants: [
      { key: "1g-single", name: "1 g single", priceCents: 800 },
      { key: "1g-5", name: "1 g, 5 pack", priceCents: 3400 },
    ],
    specs: {
      strengthMg: 150,
      spectrum: "full",
      labTested: true,
      servingSize: "1 pre-roll",
      ingredients: ["hemp flower", "unbleached cone"],
    },
    createdAt: "2025-11-26T10:00:00.000Z",
  },
  {
    slug: "mini-hemp-pre-roll-pack",
    name: "Mini hemp pre-roll pack",
    sku: "HB-PRE-MINI",
    category: HEMP_PRE_ROLLS_CATEGORY,
    photo: 1,
    shortDescription:
      "Ten half-gram CBD hemp pre-rolls in unbleached cones, packed in a flat hinged tin.",
    description: [
      "Ten smaller pre-rolls, each with 0.5 g of ground CBD hemp flower in an unbleached cone with a card tip. They come in a flat, hinged tin that fits in a pocket.",
      "The same flower as the classic pre-roll, tested by an independent lab every batch, with the batch number printed inside the lid.",
    ],
    variants: [{ key: "05g-10", name: "0.5 g, 10 pack", priceCents: 3600 }],
    specs: {
      strengthMg: 75,
      spectrum: "full",
      labTested: true,
      servingSize: "1 pre-roll",
      ingredients: ["hemp flower", "unbleached cone"],
    },
    createdAt: "2025-12-02T10:00:00.000Z",
  },
  {
    slug: "pine-hemp-pre-roll-duo",
    name: "Pine hemp pre-roll duo",
    sku: "HB-PRE-PINE",
    category: HEMP_PRE_ROLLS_CATEGORY,
    photo: 2,
    shortDescription:
      "Two 1 g pre-rolls of a pine-forward CBD hemp flower, in unbleached cones with card tips.",
    description: [
      "Two 1 g pre-rolls made with a hemp flower that has a sharp, piney aroma. Each one is packed by hand into an unbleached cone with a folded card tip.",
      "The pair ships in a single glass tube with a child-resistant cap. Every batch is lab tested and the batch number is printed on the tube.",
    ],
    variants: [{ key: "1g-2", name: "1 g, 2 pack", priceCents: 1500 }],
    specs: {
      strengthMg: 150,
      spectrum: "full",
      labTested: true,
      servingSize: "1 pre-roll",
      ingredients: ["hemp flower", "unbleached cone"],
    },
    createdAt: "2025-12-08T10:00:00.000Z",
  },
  {
    slug: "hemp-flower-jar",
    name: "Hemp flower jar",
    sku: "HB-PRE-FLOWER",
    category: HEMP_FLOWER_CATEGORY,
    images: [
      {
        file: "flower-jar.jpg",
        alt: "Dried flower buds with orange hairs inside an open clear glass jar",
      },
      {
        file: "flower-buds.jpg",
        alt: "Close-up of dried flower buds on a white cloth",
      },
    ],
    shortDescription:
      "Whole CBD hemp flower, trimmed by hand and packed in a smell-proof glass jar. 3.5 g or 7 g.",
    description: [
      "Whole, hand-trimmed CBD hemp flower, dried slowly and packed loose in a glass jar with a clamp lid and a silicone seal.",
      "Grown on licensed farms in Oregon and tested by an independent lab every batch. The batch number is printed on the base of the jar.",
    ],
    variants: [
      { key: "3-5g", name: "3.5 g", priceCents: 2500 },
      { key: "7g", name: "7 g", priceCents: 4500 },
    ],
    specs: {
      strengthMg: 525,
      spectrum: "full",
      labTested: true,
      servingSize: "as needed",
      ingredients: ["hemp flower"],
    },
    createdAt: "2025-12-14T10:00:00.000Z",
  },
];

function toCategory(seed: CategorySeed, index: number): Category {
  return {
    id: `cat_${seed.slug}`,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    imageUrl: categoryImage(seed.slug),
    sortOrder: index + 1,
    createdAt: "2025-01-02T09:00:00.000Z",
    updatedAt: "2025-01-02T09:00:00.000Z",
  };
}

function toProduct(seed: ProductSeed): Product {
  const [defaultVariant] = seed.variants;
  if (!defaultVariant) {
    throw new Error(`Seed catalog: product "${seed.slug}" has no variants`);
  }
  if (!categorySeeds.some((c) => c.slug === seed.category)) {
    throw new Error(`Seed catalog: unknown category "${seed.category}"`);
  }
  return {
    id: `prod_${seed.slug}`,
    name: seed.name,
    slug: seed.slug,
    description: seed.description.join("\n\n"),
    shortDescription: seed.shortDescription,
    priceCents: defaultVariant.priceCents,
    compareAtPriceCents: seed.compareAtPriceCents ?? null,
    sku: seed.sku,
    categoryId: `cat_${seed.category}`,
    inventory: seed.inventory ?? DEFAULT_INVENTORY,
    status: seed.status ?? "active",
    featured: seed.featured ?? false,
    specs: seed.specs,
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
  };
}

function galleryFor(seed: ProductSeed): { url: string; alt: string }[] {
  const { photo, images } = seed;
  if (photo !== undefined && images === undefined) {
    return Array.from({ length: IMAGE_COUNT }, (_, index) =>
      productImage(seed.category, photo, index + 1),
    );
  }
  if (photo === undefined && images !== undefined && images.length > 0) {
    return images.map(({ file, alt }) => ({
      url: `/images/products/${seed.category}/${file}`,
      alt,
    }));
  }
  throw new Error(
    `Seed catalog: product "${seed.slug}" needs exactly one of "photo" or "images"`,
  );
}

function toProductImages(seed: ProductSeed): ProductImage[] {
  return galleryFor(seed).map(({ url, alt }, index) => {
    const n = index + 1;
    return {
      id: `img_${seed.slug}-${n}`,
      productId: `prod_${seed.slug}`,
      url,
      alt,
      sortOrder: n,
    };
  });
}

function toProductVariants(seed: ProductSeed): ProductVariant[] {
  return seed.variants.map((variant, index) => ({
    id: `var_${seed.slug}-${variant.key}`,
    productId: `prod_${seed.slug}`,
    name: variant.name,
    sku: `${seed.sku}-${variant.key}`,
    // The default variant uses the product price; others carry an override.
    priceCents: index === 0 ? null : variant.priceCents,
    inventory: variant.inventory ?? seed.inventory ?? DEFAULT_INVENTORY,
    sortOrder: index + 1,
    isDefault: index === 0,
  }));
}

interface ReviewSeed {
  product: string;
  author: string;
  rating: Review["rating"];
  title: string;
  body: string;
  createdAt: string;
  hidden?: boolean;
}

const reviewSeeds: ReviewSeed[] = [
  {
    product: "calm-full-spectrum-oil",
    author: "Maya R.",
    rating: 5,
    title: "Mild taste, easy dropper",
    body: "The earthy taste is lighter than other oils I have tried and the dropper markings make measuring simple. Arrived in three days, well padded.",
    createdAt: "2025-02-10T15:00:00.000Z",
  },
  {
    product: "calm-full-spectrum-oil",
    author: "Jonas K.",
    rating: 4,
    title: "Good bottle, grassy finish",
    body: "The bottle and dropper are solid. The finish is a bit grassy for me, but it goes away quickly with a sip of water.",
    createdAt: "2025-03-01T15:00:00.000Z",
  },
  {
    product: "calm-full-spectrum-oil",
    author: "Priya S.",
    rating: 5,
    title: "Batch number on the bottle",
    body: "I like that the batch number is printed right on the base and the lab report matched it. Packaging was tidy and nothing leaked.",
    createdAt: "2025-04-12T15:00:00.000Z",
  },
  {
    product: "calm-full-spectrum-oil",
    author: "Theo B.",
    rating: 3,
    title: "Fine, but the cap is stiff",
    body: "Oil is fine and the taste is mild. The child-resistant cap is stiff to open the first few times.",
    createdAt: "2025-06-02T15:00:00.000Z",
  },
  {
    product: "daily-broad-spectrum-drops",
    author: "Elena M.",
    rating: 5,
    title: "Faint citrus, mixes into tea",
    body: "The orange note is subtle and it disappears into a mug of tea. Shipping was quick and the box had a printed lab summary inside.",
    createdAt: "2025-02-20T15:00:00.000Z",
  },
  {
    product: "daily-broad-spectrum-drops",
    author: "Marcus L.",
    rating: 4,
    title: "Clean label",
    body: "Clear label with strength and spectrum right on the front. The oil is thin and the dropper does not drip.",
    createdAt: "2025-03-15T15:00:00.000Z",
  },
  {
    product: "daily-broad-spectrum-drops",
    author: "Sofia A.",
    rating: 5,
    title: "Repeat order",
    body: "Second bottle. Same taste and same packaging as the first, which is what I wanted.",
    createdAt: "2025-05-20T15:00:00.000Z",
  },
  {
    product: "evening-cbd-cbn-drops",
    author: "Hannah W.",
    rating: 4,
    title: "Soft lavender taste",
    body: "The lavender and vanilla are gentle and not perfumed. The bottle came with a tamper band intact.",
    createdAt: "2025-03-05T15:00:00.000Z",
  },
  {
    product: "evening-cbd-cbn-drops",
    author: "Derek P.",
    rating: 5,
    title: "Smooth, no bitterness",
    body: "Smooth on the tongue and no bitter aftertaste. The label lists CBD and CBN per mL, which I appreciated.",
    createdAt: "2025-04-22T15:00:00.000Z",
  },
  {
    product: "mint-isolate-tincture",
    author: "Aiden C.",
    rating: 5,
    title: "Just mint",
    body: "Tastes like peppermint and nothing else. The oil is clear and the dropper is marked clearly.",
    createdAt: "2025-03-10T15:00:00.000Z",
  },
  {
    product: "mint-isolate-tincture",
    author: "Leah F.",
    rating: 4,
    title: "Strong mint",
    body: "The mint is strong, more than I expected. Bottle and dropper are good quality and it shipped fast.",
    createdAt: "2025-04-18T15:00:00.000Z",
  },
  {
    product: "mint-isolate-tincture",
    author: "Ravi N.",
    rating: 5,
    title: "Good value on sale",
    body: "Picked this up on sale. Packaging was neat, the seal was intact, and there is no hemp taste at all.",
    createdAt: "2025-07-08T15:00:00.000Z",
  },
  {
    product: "citrus-full-spectrum-oil",
    author: "Nora D.",
    rating: 4,
    title: "Bright and a little sweet",
    body: "The citrus covers most of the hemp taste. The finish is a little sweet. Bottle arrived well wrapped.",
    createdAt: "2025-03-30T15:00:00.000Z",
  },
  {
    product: "citrus-full-spectrum-oil",
    author: "Ben H.",
    rating: 3,
    title: "Still some hemp taste",
    body: "There is still a hemp taste under the citrus, more than the mint isolate. Dropper and bottle are fine.",
    createdAt: "2025-05-11T15:00:00.000Z",
  },
  {
    product: "mixed-berry-gummies",
    author: "Chloe T.",
    rating: 5,
    title: "Soft and fruity",
    body: "Soft pectin texture and a real berry taste, not artificial. The pouch reseals well and the gummies did not stick together.",
    createdAt: "2025-04-01T15:00:00.000Z",
  },
  {
    product: "mixed-berry-gummies",
    author: "Omar Z.",
    rating: 4,
    title: "Blueberry is the best",
    body: "Blueberry is my favorite of the three. Raspberry is a bit tart. Shipping took four days.",
    createdAt: "2025-05-06T15:00:00.000Z",
  },
  {
    product: "mixed-berry-gummies",
    author: "Isla G.",
    rating: 5,
    title: "No gelatin",
    body: "Glad these are pectin based. The sugar coating is light and they are not too sweet.",
    createdAt: "2025-06-14T15:00:00.000Z",
  },
  {
    product: "mixed-berry-gummies",
    author: "Felix O.",
    rating: 3,
    title: "A little sticky in summer",
    body: "They arrived a bit soft in July heat but firmed up in the fridge. Taste is good.",
    createdAt: "2025-07-20T15:00:00.000Z",
  },
  {
    product: "citrus-isolate-gummies",
    author: "Grace L.",
    rating: 4,
    title: "Tart and firm",
    body: "Firm chew with a tart sugar coating. Grapefruit is the standout. The 60 count pouch is a good size.",
    createdAt: "2025-04-15T15:00:00.000Z",
  },
  {
    product: "citrus-isolate-gummies",
    author: "Sam J.",
    rating: 5,
    title: "No hemp taste at all",
    body: "Just citrus. The pouch is matte and reseals cleanly. Arrived in two days.",
    createdAt: "2025-06-01T15:00:00.000Z",
  },
  {
    product: "evening-gummies",
    author: "Lucy V.",
    rating: 4,
    title: "Jammy blackberry",
    body: "The blackberry flavor is deep and jammy. The gummies are softer than the citrus ones.",
    createdAt: "2025-05-02T15:00:00.000Z",
  },
  {
    product: "sour-apple-gummies",
    author: "Noah E.",
    rating: 5,
    title: "Properly sour",
    body: "Sharp green apple with a sour coating that actually is sour. Pouch arrived sealed with the batch number printed on the back.",
    createdAt: "2025-05-14T15:00:00.000Z",
  },
  {
    product: "sour-apple-gummies",
    author: "Amira K.",
    rating: 4,
    title: "Firm chew",
    body: "Firm and not sticky. The sour coating fades a bit toward the end of the pouch.",
    createdAt: "2025-06-25T15:00:00.000Z",
  },
  {
    product: "dark-chocolate-squares",
    author: "Julia P.",
    rating: 5,
    title: "Snaps cleanly",
    body: "Good dark chocolate with a clean snap and a smooth finish. Each square is foil wrapped, which is handy for a bag.",
    createdAt: "2025-06-03T15:00:00.000Z",
  },
  {
    product: "dark-chocolate-squares",
    author: "Ethan R.",
    rating: 4,
    title: "Slightly bitter, in a good way",
    body: "It is 70% so it is on the bitter side. The box is sturdy and the squares survived shipping without melting.",
    createdAt: "2025-07-15T15:00:00.000Z",
  },
  {
    product: "dark-chocolate-squares",
    author: "Zoe M.",
    rating: 5,
    title: "Nice box",
    body: "The 24 count box is nicely printed and would work as a gift. Chocolate is smooth.",
    createdAt: "2025-08-21T15:00:00.000Z",
  },
  {
    product: "cooling-muscle-balm",
    author: "Liam S.",
    rating: 5,
    title: "Cool and minty",
    body: "Firm balm that melts as you rub it in, with a strong cool mint scent. The tin fits in a gym bag.",
    createdAt: "2025-06-10T15:00:00.000Z",
  },
  {
    product: "cooling-muscle-balm",
    author: "Ava N.",
    rating: 4,
    title: "Scent fades quickly",
    body: "The menthol scent fades within a few minutes, which I like. The tin lid is a bit tight.",
    createdAt: "2025-07-22T15:00:00.000Z",
  },
  {
    product: "cooling-muscle-balm",
    author: "Kai B.",
    rating: 5,
    title: "Lasts a long time",
    body: "A pea-sized amount goes a long way. Two months in and the 60 mL tin is still half full.",
    createdAt: "2025-08-30T15:00:00.000Z",
  },
  {
    product: "warming-body-cream",
    author: "Ruby H.",
    rating: 4,
    title: "Spicy scent, absorbs well",
    body: "Ginger and cinnamon scent, absorbs in about a minute with no film. The glass jar is heavy but nice.",
    createdAt: "2025-06-28T15:00:00.000Z",
  },
  {
    product: "unscented-body-lotion",
    author: "Ivy C.",
    rating: 5,
    title: "Truly unscented",
    body: "No fragrance at all. Light texture, sinks in quickly. The pump gives a consistent amount.",
    createdAt: "2025-07-05T15:00:00.000Z",
  },
  {
    product: "unscented-body-lotion",
    author: "Owen T.",
    rating: 4,
    title: "Pump bottle is practical",
    body: "The pump is handy after a shower. Lotion is light, maybe too light for winter.",
    createdAt: "2025-08-12T15:00:00.000Z",
  },
  {
    product: "roll-on-stick",
    author: "Mila K.",
    rating: 5,
    title: "No greasy hands",
    body: "Glides on like a deodorant stick and my hands stay clean. Cap snaps on firmly.",
    createdAt: "2025-08-02T15:00:00.000Z",
  },
  {
    product: "roll-on-stick",
    author: "Jack D.",
    rating: 4,
    title: "Camphor scent is noticeable",
    body: "The camphor scent is noticeable for a few minutes. The tube is a good size for travel.",
    createdAt: "2025-09-09T15:00:00.000Z",
  },
  {
    product: "chamomile-evening-tea",
    author: "Ella W.",
    rating: 5,
    title: "Honey-like taste",
    body: "Whole chamomile flowers and a soft, honey-like taste. The tin reseals and keeps the sachets fresh.",
    createdAt: "2025-08-15T15:00:00.000Z",
  },
  {
    product: "chamomile-evening-tea",
    author: "Henry M.",
    rating: 4,
    title: "Plant-based sachets",
    body: "Nice that the sachets are plant based. Brews pale gold. Ten per tin goes quickly.",
    createdAt: "2025-09-19T15:00:00.000Z",
  },
  {
    product: "peppermint-day-tea",
    author: "Stella R.",
    rating: 5,
    title: "Good over ice",
    body: "Strong mint with no bitterness. I brew two sachets and pour over ice. Tin is sturdy.",
    createdAt: "2025-09-01T15:00:00.000Z",
  },
  {
    product: "broad-spectrum-softgels",
    author: "Caleb F.",
    rating: 5,
    title: "Easy to travel with",
    body: "No taste and nothing to measure. The amber bottle has a child-resistant cap and the 60 count is good value.",
    createdAt: "2025-09-20T15:00:00.000Z",
  },
  {
    product: "broad-spectrum-softgels",
    author: "Nina L.",
    rating: 4,
    title: "Small softgels",
    body: "Softgels are small and easy to swallow. Shipping was quick, bottle was sealed.",
    createdAt: "2025-10-11T15:00:00.000Z",
  },
  {
    product: "ceramic-ashtray",
    author: "Rosa B.",
    rating: 5,
    title: "Lovely glaze",
    body: "The speckled sage glaze is lovely and it is heavier than it looks. Survived the dishwasher.",
    createdAt: "2025-11-05T15:00:00.000Z",
  },
  {
    product: "matcha-blend",
    author: "Anonymous",
    rating: 3,
    title: "Clumps a little",
    body: "Whisks up fine but clumps if you do not sift it. The tin's inner seal was intact.",
    createdAt: "2025-09-12T15:00:00.000Z",
    hidden: true,
  },
  {
    product: "honey-sticks",
    author: "Anonymous",
    rating: 4,
    title: "Sticky but good",
    body: "The straws are fiddly to open but the honey is thick and floral.",
    createdAt: "2025-06-18T15:00:00.000Z",
    hidden: true,
  },
];

function toReview(seed: ReviewSeed, index: number): Review {
  return {
    id: `rev_${String(index + 1).padStart(3, "0")}`,
    productId: `prod_${seed.product}`,
    // Historical reviews have no account behind them.
    userId: null,
    authorName: seed.author,
    rating: seed.rating,
    title: seed.title,
    body: seed.body,
    status: seed.hidden ? "hidden" : "published",
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
  };
}

export interface SeedCatalog {
  categories: Category[];
  products: Product[];
  productImages: ProductImage[];
  productVariants: ProductVariant[];
  reviews: Review[];
}

/** House products, then the brand tinctures, glassware and hemp flower. */
const allProductSeeds: ProductSeed[] = [
  ...productSeeds,
  ...brandTinctureSeeds,
  ...glasswareSeeds,
  ...hempFlowerSeeds,
];

/**
 * The full catalog regardless of feature flags: 8 categories, the house
 * products (all active except the archived `gift-box`), the brand tinctures
 * and glassware from `./catalog-brands` and the strains from
 * `./catalog-flower`. Pure, so the seed and tests build the same data.
 * Visibility rules live in `@/lib/catalog-visibility`.
 */
export function buildSeedCatalog(): SeedCatalog {
  return {
    categories: categorySeeds.map(toCategory),
    products: allProductSeeds.map(toProduct),
    productImages: allProductSeeds.flatMap(toProductImages),
    productVariants: allProductSeeds.flatMap(toProductVariants),
    reviews: reviewSeeds.map(toReview),
  };
}
