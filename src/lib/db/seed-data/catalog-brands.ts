/**
 * Brand products: the glassware category and third-party CBD tinctures. Each
 * product has one own photo (`images`) instead of a gallery from the shared
 * photo pools. Photos are brand product shots, allowed here as a deliberate
 * exception to the photo rules; sources are listed in `docs/image-credits.md`.
 * Copy is ours. See `docs/superpowers/specs/2026-09-22-glassware-brand-tinctures-design.md`.
 */
import type { ProductSpecs } from "@/types/catalog";
import type { PoolPhoto, ProductSeed } from "./catalog";

/** `start` (a date) at 10:00Z, moved on by `offsetDays`, as an ISO string. */
export function seedDate(start: string, offsetDays: number): string {
  const date = new Date(`${start}T10:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
}

/** Pricier pieces are stocked in smaller numbers. */
function glasswareInventory(priceCents: number): number {
  if (priceCents >= 30000) return 2;
  if (priceCents >= 10000) return 6;
  if (priceCents >= 3000) return 12;
  return 24;
}

interface GlasswareRow {
  slug: string;
  name: string;
  /** SKU suffix: `HB-GLS-<key>`. */
  key: string;
  priceCents: number;
  alt: string;
  shortDescription: string;
  description: [string, string];
}

const glasswareRows: GlasswareRow[] = [
  {
    slug: "eyeball-monster-beaker",
    name: "Eyeball monster beaker, 12 in",
    key: "EYEBALL",
    priceCents: 13500,
    alt: "Clear glass beaker water pipe wrapped in a red sculpted monster with tentacles, blue eyes and white fangs",
    shortDescription:
      "A 12 in clear glass beaker covered in a hand-sculpted red monster with tentacles, rows of blue eyes and white fangs.",
    description: [
      "The body is a classic beaker shape in clear glass, 12 in tall, with a red monster sculpted around the neck and base. Tentacles climb the neck, a ring of blue eyes sits at the shoulder and the base is lined with white and blue fangs.",
      "Pinched notches on the neck hold ice cubes above the water line. It ships with a glass downstem and bowl, both removable for rinsing.",
    ],
  },
  {
    slug: "iridescent-beaker-16in",
    name: "Iridescent beaker, 16 in",
    key: "IRID16",
    priceCents: 10000,
    alt: "Tall clear glass beaker water pipe with a gold and violet iridescent finish and a glass bowl",
    shortDescription:
      "A tall 16 in glass beaker with a rainbow iridescent finish, an extra-long neck and ice notches.",
    description: [
      "A 16 in beaker in clear glass with an iridescent coating that shifts between gold, pink and violet as it catches the light. The neck is extra long and has pinched notches that hold ice.",
      "Comes with a 4.5 in downstem and a 14 mm bowl. The flat, wide beaker base keeps it steady on a table.",
    ],
  },
  {
    slug: "bubble-beaker-8in",
    name: "Bubble beaker, 8 in",
    key: "BUBBLE8",
    priceCents: 2800,
    alt: "Six small swirled-glass water pipes with round bubble bodies on pedestal feet, in yellow, red, blue, orange and green",
    shortDescription:
      "An 8 in swirled-glass water pipe with a round bubble body on a pedestal foot; colour varies.",
    description: [
      "A compact 8 in piece with a straight tube neck, a round bubble body and a short pedestal foot. The glass is worked with streaks of colour and finished with a light iridescent sheen.",
      "Each one is made by hand, so the colour varies: yellow, red, blue, orange and green are all in the mix, and we pick one at random.",
    ],
  },
  {
    slug: "honey-water-pipe",
    name: "Honey glass water pipe, 32 cm",
    key: "HONEY",
    priceCents: 10000,
    alt: "Clear glass beaker water pipe painted with bees, flowers and honeycomb, with yellow and black striped bands, beside the Grace Glass logo",
    shortDescription:
      "A 32 cm clear glass beaker from Grace Glass, painted with bees, flowers and honeycomb in yellow and black.",
    description: [
      "A 32 cm beaker in clear glass, painted all over with cartoon bees, white flowers, a hanging hive and a honeycomb panel. The mouthpiece and base have yellow and black striped bands.",
      "The wide base keeps it stable. It comes with a glass downstem and a black glass bowl.",
    ],
  },
  {
    slug: "ice-alien-water-pipe",
    name: "Ice alien water pipe, 35 cm",
    key: "ICEALIEN",
    priceCents: 10000,
    alt: "Clear glass beaker water pipe with a sculpted green alien in a purple suit and a blue mouthpiece",
    shortDescription:
      "A 35 cm glass beaker with a sculpted green alien in a purple suit climbing up the front.",
    description: [
      "A 35 cm clear glass beaker with a green alien sculpted onto the front: orange eyes, a ridged head and a purple suit with a pink belt. The mouthpiece is sky blue and blue drips run down the neck.",
      "The neck has an ice compartment above the water line, and the wide base keeps it steady. It comes with a clear glass downstem and bowl.",
    ],
  },
  {
    slug: "yellow-cyclops-beaker",
    name: "Yellow cyclops beaker, 12.6 in",
    key: "CYCLOPS",
    priceCents: 13500,
    alt: "Glass beaker water pipe covered in a sculpted yellow one-eyed monster with an open green-lined mouth and a red tongue",
    shortDescription:
      "A 12.6 in thick borosilicate beaker wrapped in a yellow one-eyed monster with a wide-open mouth.",
    description: [
      "Made from 7 mm borosilicate glass and standing 12.6 in tall. A yellow cyclops is sculpted around the whole piece, with a single blue eye on the neck and a gaping mouth, rows of teeth and a red tongue around the base.",
      "It has an 18 mm female joint and comes with a large glass bowl. Pinched notches on the neck hold ice, and the beaker base keeps it stable.",
    ],
  },
  {
    slug: "famous-design-papaya-beaker",
    name: "Famous Design papaya beaker, 12 in",
    key: "PAPAYA",
    priceCents: 10000,
    alt: "Clear glass beaker water pipe with a blue, red and yellow abstract print on the neck and base and a black mouthpiece",
    shortDescription:
      "A 12 in thick glass beaker from Famous Design with a bold blue, red and yellow abstract print.",
    description: [
      "Handmade by Famous Design from thick borosilicate glass, 12 in tall. The neck and the lower half of the beaker carry an abstract print in navy, red and yellow, and the mouthpiece is ringed in black.",
      "The slitted downstem spreads the water flow and lifts out for cleaning. It comes with a clear glass bowl, and ice notches sit at the base of the neck.",
    ],
  },
  {
    slug: "glow-frog-beaker",
    name: "Glow-in-the-dark frog beaker, 12.5 in",
    key: "FROG",
    priceCents: 11500,
    alt: "Clear glass beaker water pipe with a sculpted green tree frog climbing the neck and green grass shapes around the base",
    shortDescription:
      "A 12.5 in glass beaker with a green tree frog climbing the neck, finished in glow-in-the-dark paint.",
    description: [
      "A heavy 12.5 in beaker in thick clear glass. A green and orange tree frog is sculpted onto the neck and tall grass shapes rise around the base, all in paint that glows in the dark.",
      "It comes with a 14 mm male glass bowl. Ice notches sit below the frog, and the black-banded base is wide and stable.",
    ],
  },
  {
    slug: "chongz-ollie-water-pipe",
    name: "Chongz Ollie water pipe, 21 cm",
    key: "OLLIE",
    priceCents: 12000,
    alt: "Compact glass water pipe with a periwinkle blue neck printed with the Chongz logo and a fumed honeycomb-pattern body",
    shortDescription:
      "A compact 21 cm Chongz water pipe with a periwinkle neck and a honeycomb-patterned body.",
    description: [
      "A 21 cm piece from Chongz in 3 mm glass, with a 7.5 cm base. The neck is periwinkle blue with the Chongz logo, and the hourglass body carries a fumed honeycomb pattern with a Greek key band at the foot.",
      "The downstem has a built-in barrel percolator. The bowl fits a 14.5 mm joint, has a handle and lifts out for cleaning; the mouthpiece is about 2.5 cm across.",
    ],
  },
  {
    slug: "ice-bob-alien-water-pipe",
    name: "Ice Bob green alien water pipe, 35 cm",
    key: "ICEBOB",
    priceCents: 10000,
    alt: "Tall clear glass beaker water pipe with sculpted one-eyed green creatures in red and purple hats climbing the outside",
    shortDescription:
      "A 35 cm clear glass beaker with a crew of one-eyed green creatures in hats climbing the outside.",
    description: [
      "A 35 cm beaker in clear glass. Sculpted one-eyed green creatures with long legs and toothy grins hang off the neck and base, wearing red and purple hats.",
      "The neck has an ice compartment and the base is wide for stability. It comes with a clear glass downstem and bowl.",
    ],
  },
  {
    slug: "flower-skull-water-pipe",
    name: "Flower skull water pipe, 26 cm",
    key: "SKULL",
    priceCents: 10000,
    alt: "Glass beaker water pipe fully printed with pink, purple and blue sugar skulls and roses, with a clear bowl",
    shortDescription:
      "A 26 cm glass beaker covered in a print of Mexican sugar skulls and roses in pink, purple and blue.",
    description: [
      "A 26 cm beaker wrapped from rim to base in a Día de los Muertos print: sugar skulls, roses and lace patterns in pink, purple, teal and black.",
      "It comes with a clear glass bowl on a matching printed stem. The flared beaker base keeps it steady.",
    ],
  },
  {
    slug: "mini-mushroom-water-pipe",
    name: "Mini mushroom water pipe, 17 cm",
    key: "MUSHROOM",
    priceCents: 10000,
    alt: "Small glass water pipe covered in a brown sculpted tree trunk with red spotted mushrooms, green moss and yellow leaves",
    shortDescription:
      "A small 17 cm glass piece shaped like a tree trunk, covered in red spotted mushrooms and moss.",
    description: [
      "A short, sturdy piece in 3 mm glass, sculpted to look like a brown tree trunk. Red toadstools with white spots, green moss and yellow leaves grow up the sides, and the mouthpiece is green.",
      "The glass bowl is removable for easy cleaning. The base is 8 cm across and the mouthpiece is 1.5 cm wide.",
    ],
  },
  {
    slug: "hand-pipe-3in-assorted",
    name: "Hand pipe, 3 in, assorted colours",
    key: "HP3",
    priceCents: 1000,
    alt: "Small fumed glass spoon hand pipe with blue swirls, seen from above on a white background",
    shortDescription:
      "A pocket-size 3 in glass spoon pipe with fumed swirls; colour varies.",
    description: [
      "A small spoon-shaped hand pipe in fumed glass, 3 in long, with swirls worked through the stem and bowl. The bowl has a carb hole on the side.",
      "Colours vary between blue, green and yellow, and we pick one at random. Each pipe is made by hand, so no two are exactly the same.",
    ],
  },
  {
    slug: "frit-cap-hand-pipe-3in",
    name: "Fumed frit cap hand pipe, 3 in",
    key: "HP3FRIT",
    priceCents: 1000,
    alt: "Small fumed glass spoon hand pipe with a pink frit bowl and amber glass dots",
    shortDescription:
      "A 3 in fumed glass spoon pipe with a speckled frit cap over the bowl and raised glass dots.",
    description: [
      "A 3 in spoon pipe in fumed glass. The bowl is capped with crushed coloured glass (frit) that gives it a speckled look, and raised glass dots on the sides stop it tipping over on a table.",
      "The colour of the frit varies from piece to piece. Each pipe is made by hand, so colour and pattern will differ from the photo.",
    ],
  },
  {
    slug: "frit-dust-hand-pipe-4in",
    name: "Fumed frit dust hand pipe, 4 in",
    key: "HP4DUST",
    priceCents: 2000,
    alt: "Fumed glass spoon hand pipe speckled with blue frit and three coloured glass marbles on the bowl",
    shortDescription:
      "A 4 in fumed glass spoon pipe dusted with coloured frit and three glass marbles on the bowl.",
    description: [
      "A 4 in spoon pipe in fumed glass, dusted all over with specks of coloured frit. Three glass marbles on the side of the bowl act as feet, and a ribbed collar sits between bowl and stem.",
      "The fumed glass shows gold or silver tones and they vary from piece to piece. Colour varies; we pick one at random.",
    ],
  },
  {
    slug: "slyme-hand-pipe-4in",
    name: "Slyme hand pipe, 4 in",
    key: "HP4SLYME",
    priceCents: 2000,
    alt: "Opaque lime green glass spoon hand pipe with a ribbed collar and a small glass marble on the bowl",
    shortDescription:
      "A 4 in spoon pipe in opaque slyme glass with a ribbed collar; colour varies.",
    description: [
      "A 4 in spoon pipe made from slyme, an opaque, milky coloured glass. A ribbed collar sits between the bowl and the stem, and a small glass marble on the bowl works as a foot.",
      "It comes in green or purple and we pick one at random. Colour varies from piece to piece.",
    ],
  },
  {
    slug: "spiral-hand-pipe-4in",
    name: "Spiral hand pipe, 4 in",
    key: "HP4SPIRAL",
    priceCents: 2000,
    alt: "Clear glass spoon hand pipe with blue and white spiral canes running along the stem and a blue marble on the bowl",
    shortDescription:
      "A 4 in glass spoon pipe with twisted spiral canes along the stem; colour varies.",
    description: [
      "A 4 in spoon pipe in clear glass with twisted spiral canes running the length of the stem and wrapping the bowl. A glass marble on the bowl keeps it from tipping.",
      "Each one is made by hand, so the colours of the spirals vary from the photo.",
    ],
  },
  {
    slug: "two-tone-hand-pipe-4in",
    name: "Two-tone hand pipe, 4 in",
    key: "HP4TWO",
    priceCents: 2000,
    alt: "Transparent pink glass spoon hand pipe with a lime green mouthpiece and green dots on the bowl",
    shortDescription:
      "A 4 in two-tone glass spoon pipe with a contrasting mouthpiece and dotted bowl; colour varies.",
    description: [
      "A 4 in spoon pipe in transparent coloured glass with a contrasting opaque mouthpiece and small raised dots around the bowl.",
      "It comes in blue, teal or pink and we pick one at random. Colour varies from piece to piece.",
    ],
  },
  {
    slug: "hemper-popcorn-xl",
    name: "Hemper Popcorn XL water pipe, 9 in",
    key: "POPCORN",
    priceCents: 19900,
    alt: "Glass water pipe shaped like a red and white striped popcorn bucket with a yellow popcorn top and a white glass straw",
    shortDescription:
      "A 9 in Hemper water pipe shaped like a striped popcorn bucket, complete with a glass straw.",
    description: [
      "Made by Hemper in 5 mm glass, 9 in tall and 4.5 in across. It looks like a red and white striped popcorn bucket with a yellow popcorn lid and a white glass straw for the mouthpiece.",
      "Inside, an angled stem feeds a popcorn-shaped percolator. It comes with a 14 mm male bowl in matching red and clear glass.",
    ],
  },
  {
    slug: "higher-standards-haring-water-pipe",
    name: "Higher Standards K. Haring water pipe",
    key: "HARING",
    priceCents: 16000,
    alt: "Clear glass beaker water pipe with a yellow band of Keith Haring dancing figures, beside its white and yellow box",
    shortDescription:
      "A clear glass beaker from Higher Standards with a band of Keith Haring's dancing figures.",
    description: [
      "A clear glass beaker from the Higher Standards Keith Haring collection. A yellow band around the neck shows Haring's bold dancing figures in purple, green and red, and the piece carries the artist's signature.",
      "It has a wide lip on the mouthpiece, a built-in ice catcher and a splash guard. It ships in a printed gift box.",
    ],
  },
  {
    slug: "hillside-honeycomb-beaker",
    name: "Hillside Glass metallic honeycomb beaker, 14 in",
    key: "HONEYCOMB",
    priceCents: 8700,
    alt: "Two matte glass beaker water pipes etched with glossy honeycomb patterns, one iridescent violet and one gold",
    shortDescription:
      "A 14 in Hillside Glass beaker with glossy honeycomb patterns etched into a matte metallic finish.",
    description: [
      "A 14 in beaker from Hillside Glass. The body has a matte metallic finish with glossy honeycomb patterns etched out of it, and a shiny band around the lower neck.",
      "It has ice notches in the neck and comes with a 5 in downstem and a 14 mm bowl. The finish comes in iridescent or gold and varies by batch.",
    ],
  },
  {
    slug: "hillside-gold-beaker",
    name: "Hillside Glass gold iridescent beaker, 8 in",
    key: "GOLD8",
    priceCents: 3900,
    alt: "Short gold-tinted glass beaker water pipe with an iridescent sheen and a clear glass bowl",
    shortDescription:
      "An 8 in Hillside Glass beaker in gold-tinted glass with an iridescent sheen.",
    description: [
      "An 8 in beaker from Hillside Glass in gold-coloured glass with an iridescent finish. The neck is narrow, with an ice pinch just above the beaker base.",
      "It comes with a 2.5 in downstem and a 14 mm bowl. The sturdy beaker base keeps it upright.",
    ],
  },
  {
    slug: "hillside-iridescent-bubble",
    name: "Hillside Glass iridescent bubble, 8 in",
    key: "IRIDBUB8",
    priceCents: 3100,
    alt: "Dark glass water pipe with a bent neck, a round bubble base and a rainbow iridescent finish",
    shortDescription:
      "An 8 in Hillside Glass piece with a bent neck, a round bubble base and a rainbow finish.",
    description: [
      "An 8 in piece from Hillside Glass in dark glass with a rainbow iridescent finish. The neck bends forward and sits on a large round bubble base.",
      "It comes with a 2.5 in downstem and 14 mm bowl in one piece.",
    ],
  },
  {
    slug: "glass-clay-monster",
    name: "Yellow glass-clay monster water pipe, 16 cm",
    key: "CLAYMONSTER",
    priceCents: 10000,
    alt: "Small glass water pipe covered in a sculpted yellow one-eyed monster with horns and white fangs, beside a clear glass bowl",
    shortDescription:
      "A small 16 cm water pipe covered in a yellow one-eyed monster sculpted from glass clay.",
    description: [
      "A 16 cm piece with a yellow monster sculpted from glass clay around the glass body: one big blue eye, two small horns and a wide red mouth lined with white fangs.",
      "The glass clay makes it heavier than it looks, about 0.35 kg. It comes with a clear glass bowl.",
    ],
  },
  {
    slug: "oil-slick-beaker",
    name: "Oil slick beaker, 8 in",
    key: "OILSLICK",
    priceCents: 9000,
    alt: "Short glass beaker water pipe with an oil slick finish in yellow, pink and green and a clear glass bowl",
    shortDescription:
      "An 8 in beaker with an oil slick finish that shifts between yellow, pink and green.",
    description: [
      "An 8 in beaker coated in an oil slick finish, with bands of yellow, pink, green and violet running down the neck and base.",
      "It has a 14 mm female joint at 45 degrees and a removable slitted downstem. It comes with a clear glass bowl.",
    ],
  },
  {
    slug: "quartz-banger-10mm",
    name: "Quartz banger, 10 mm male, 90°",
    key: "BANGER10",
    priceCents: 1500,
    alt: "Clear quartz banger nail with a flat-top bucket and a 90 degree bend on a white background",
    shortDescription:
      "A clear quartz banger with a flat-top bucket, a 90° neck and a 10 mm male joint.",
    description: [
      "A banger nail made from clear quartz, with a flat-top bucket on a neck bent at 90°. The 10 mm male joint fits a 10 mm female joint.",
      "Quartz takes heat evenly and cleans up with a cotton swab and isopropyl alcohol once it has cooled.",
    ],
  },
  {
    slug: "quartz-banger-18mm",
    name: "Quartz banger, 18 mm male, 90°",
    key: "BANGER18",
    priceCents: 1500,
    alt: "Clear quartz banger nail with a flat-top bucket, a curved neck and a wide joint on a white background",
    shortDescription:
      "A clear quartz banger with a flat-top bucket, a 90° neck and an 18 mm male joint.",
    description: [
      "A banger nail made from clear quartz, with a flat-top bucket on a neck bent at 90°. The 18 mm male joint fits an 18 mm female joint.",
      "Quartz takes heat evenly and cleans up with a cotton swab and isopropyl alcohol once it has cooled.",
    ],
  },
  {
    slug: "owl-silicone-water-pipe",
    name: "Owl silicone water pipe, 16 cm",
    key: "OWL",
    priceCents: 9900,
    alt: "Blue silicone water pipe shaped like an owl with yellow eyes, a glass bowl on its head and a mouthpiece at the back",
    shortDescription:
      "A 16 cm silicone water pipe shaped like an owl, with a glass bowl and a window in its chest.",
    description: [
      "A 16 cm owl in soft silicone with yellow eyes, a black beak and brown feet. A window in the chest shows the water chamber, and the mouthpiece sticks out behind the head.",
      "Silicone is light and hard to break, so it packs well. The glass bowl is removable for cleaning, and it comes in blue or green.",
    ],
  },
  {
    slug: "stundenglass-gravity-infuser",
    name: "Stündenglass gravity infuser, polished silver",
    key: "STUNDEN",
    priceCents: 79900,
    alt: "Stündenglass gravity infuser with two clear glass globes on a polished silver rotating hub, a side tray and a round base",
    shortDescription:
      "The Stündenglass gravity infuser in polished silver: two glass globes on a rotating hub that draws air through water.",
    description: [
      "Two clear glass globes sit on a polished silver hub that rotates on its stand. As the water runs from the top globe to the bottom one, it draws air through a built-in percolator and fills the lower globe for a hands-free pull.",
      "The side arm holds a metal bowl with a lid on a small tray. It suits hookah and aromatherapy use, and the globes lift off for cleaning.",
    ],
  },
];

export const glasswareSeeds: ProductSeed[] = glasswareRows.map(
  (row, index) => ({
    slug: row.slug,
    name: row.name,
    sku: `HB-GLS-${row.key}`,
    category: "glassware",
    images: [{ file: `${row.slug}.jpg`, alt: row.alt } satisfies PoolPhoto],
    shortDescription: row.shortDescription,
    description: row.description,
    variants: [{ key: "single", name: "One size", priceCents: row.priceCents }],
    specs: null,
    inventory: glasswareInventory(row.priceCents),
    createdAt: seedDate("2026-01-06", index * 3),
  }),
);

interface BrandTinctureRow {
  slug: string;
  name: string;
  sku: string;
  /** Total CBD per bottle; also the variant key and name (`<mg> mg`). */
  mg: number;
  priceCents: number;
  spectrum: ProductSpecs["spectrum"];
  ingredients: string[];
  alt: string;
  shortDescription: string;
  description: [string, string];
}

const BRAND_TINCTURE_INVENTORY = 20;

const brandTinctureRows: BrandTinctureRow[] = [
  {
    slug: "cbdfx-cbd-cbg-oil",
    name: "CBDfx CBD + CBG oil, 30 mL",
    sku: "HB-TIN-CBDFX",
    mg: 500,
    priceCents: 3399,
    spectrum: "full",
    ingredients: [
      "hemp extract",
      "CBG",
      "curcumin",
      "coenzyme Q10",
      "terpene blend",
    ],
    alt: "CBDfx amber dropper bottle and green box labeled 500 mg CBD and 250 mg CBG, 30 mL",
    shortDescription:
      "A 30 mL CBDfx oil with 500 mg CBD and 250 mg CBG, blended with curcumin and coenzyme Q10.",
    description: [
      "Full-spectrum hemp extract with 500 mg of CBD and 250 mg of CBG per bottle, a 2:1 ratio. CBDfx adds curcumin, coenzyme Q10 and a terpene blend.",
      "It comes in a 30 mL amber glass bottle with a dropper, packed in a printed box.",
    ],
  },
  {
    slug: "farmhouse-rosin-drops-mint",
    name: "Farmhouse Hemp rosin drops, mint, 60 mL",
    sku: "HB-TIN-FARMHOUSE",
    mg: 2000,
    priceCents: 8800,
    spectrum: "full",
    ingredients: ["hemp rosin", "carrier oil", "mint flavor"],
    alt: "Farmhouse Hemp amber dropper bottle with a vintage cream label, a green cross and the words 2000 Hemp Oil, Mint Flavor",
    shortDescription:
      "A 60 mL bottle of Farmhouse Hemp full-spectrum rosin drops with 2000 mg CBD and a mint flavor.",
    description: [
      "Farmhouse Hemp presses its extract as rosin, using heat and pressure, then blends it into a carrier oil with mint flavor. Each 60 mL bottle holds 2000 mg of CBD in a full-spectrum extract.",
      "The amber glass bottle has a black dropper cap and a vintage-style cream label.",
    ],
  },
  {
    slug: "koi-cbd-orange-oil",
    name: "Koi CBD orange oil, 30 mL",
    sku: "HB-TIN-KOI",
    mg: 1000,
    priceCents: 5500,
    spectrum: "full",
    ingredients: ["carrier oil", "hemp extract", "orange flavor"],
    alt: "Koi Naturals brown dropper bottle and box, labeled Full Spectrum CBD 1000 mg, Orange, 1 fl oz",
    shortDescription:
      "A 30 mL Koi Naturals oil with 1000 mg full-spectrum CBD and an orange flavor.",
    description: [
      "A full-spectrum hemp extract in a carrier oil with orange flavor, made by Koi. Each 30 mL bottle holds 1000 mg of CBD.",
      "It comes in a brown glass bottle with a dropper, packed in a printed box with the Koi fish logo.",
    ],
  },
  {
    slug: "lazarus-chocolate-mint-oil",
    name: "Lazarus Naturals chocolate mint oil, 120 mL",
    sku: "HB-TIN-LAZMINT",
    mg: 6000,
    priceCents: 8999,
    spectrum: "full",
    ingredients: [
      "carrier oil",
      "full-spectrum hemp extract",
      "chocolate mint flavor",
    ],
    alt: "Lazarus Naturals amber dropper bottle and green box, labeled Full Spectrum CBD Tincture, Chocolate Mint, 6,000 mg CBD, 120 mL",
    shortDescription:
      "A large 120 mL Lazarus Naturals full-spectrum oil with 6000 mg CBD and a chocolate mint flavor.",
    description: [
      "Full-spectrum hemp extract in a carrier oil with a chocolate mint flavor. The 120 mL bottle holds 6000 mg of CBD, which works out at 50 mg per mL.",
      "The amber glass bottle has a dropper cap and carries the USDA Organic seal. It comes in a green printed box.",
    ],
  },
  {
    slug: "myriams-hope-daily-50",
    name: "Myriam's Hope Daily 50 olive oil drops, 30 mL",
    sku: "HB-TIN-MYRIAM",
    mg: 1500,
    priceCents: 7500,
    spectrum: "full",
    ingredients: ["olive oil", "full-spectrum hemp extract"],
    alt: "Myriam's amber dropper bottle with a white cap beside a teal and white box, labeled CBD 1500 mg, Daily 50, 1 fl oz",
    shortDescription:
      "A 30 mL bottle of Myriam's Hope Daily 50 with 1500 mg full-spectrum CBD in olive oil.",
    description: [
      "Myriam's Hope blends a full-spectrum hemp extract into olive oil. Each 30 mL bottle holds 1500 mg of CBD, or 50 mg per mL.",
      "The amber glass bottle has a white dropper cap and comes in a teal and white box.",
    ],
  },
  {
    slug: "nuleaf-full-spectrum-oil",
    name: "NuLeaf Naturals full-spectrum oil, 50 mL",
    sku: "HB-TIN-NULEAF",
    mg: 3000,
    priceCents: 11800,
    spectrum: "full",
    ingredients: ["carrier oil", "full-spectrum hemp extract"],
    alt: "NuLeaf Naturals dark glass dropper bottle beside a white box labeled Full Spectrum CBD Oil, 3000 mg per bottle",
    shortDescription:
      "A 50 mL NuLeaf Naturals full-spectrum oil with 3000 mg CBD and just two ingredients.",
    description: [
      "Two ingredients: full-spectrum hemp extract and a carrier oil, with no added flavor. Each 50 mL bottle holds 3000 mg of CBD.",
      "It comes in a dark glass bottle with a dropper cap, packed in a white box.",
    ],
  },
  {
    slug: "pure-spectrum-broad-oil",
    name: "Pure Spectrum broad-spectrum oil, natural, 60 mL",
    sku: "HB-TIN-PURESPEC",
    mg: 2500,
    priceCents: 15600,
    spectrum: "broad",
    ingredients: ["MCT oil", "broad-spectrum hemp extract", "terpenes"],
    alt: "Pure Spectrum blue glass dropper bottle and navy box labeled Cannabidiol Oil, 2500 mg, 60 mL",
    shortDescription:
      "A 60 mL Pure Spectrum broad-spectrum oil with 2500 mg CBD in MCT oil, natural flavor.",
    description: [
      "Broad-spectrum hemp extract in MCT oil with the plant's own terpenes and no added flavor. Each 60 mL bottle holds 2500 mg of CBD.",
      "It comes in a blue glass bottle with a dropper cap, packed in a navy box.",
    ],
  },
];

export const brandTinctureSeeds: ProductSeed[] = brandTinctureRows.map(
  (row, index) => ({
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    category: "tinctures",
    images: [{ file: `${row.slug}.jpg`, alt: row.alt } satisfies PoolPhoto],
    shortDescription: row.shortDescription,
    description: row.description,
    variants: [
      { key: String(row.mg), name: `${row.mg} mg`, priceCents: row.priceCents },
    ],
    specs: {
      strengthMg: row.mg,
      spectrum: row.spectrum,
      labTested: true,
      servingSize: "1 mL",
      ingredients: row.ingredients,
    },
    inventory: BRAND_TINCTURE_INVENTORY,
    createdAt: seedDate("2025-12-20", index * 2),
  }),
);
