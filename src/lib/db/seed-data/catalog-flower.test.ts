// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FLOWER_PHOTOS,
  type FlowerPhoto,
  flowerRows,
  hempFlowerSeeds,
  JAR_RANGE,
  JAR_SIZES,
} from "./catalog-flower";

/**
 * Words the flower copy must not use: legal risk (other cannabinoids and
 * plant names), effect and health claims, and gear talk. "Bubba Kush CBD" is
 * the strain's real name, so `kush` is allowed in that product's name and
 * slug only.
 */
const bannedWords =
  /\b(thc|cannabis|marijuana|weed|kush|smoke|smoking|toke|hit|herb|dab|hash|high|potency|wellness|relief|sleep|treat|cure|buzz|stoned|relax|calm|euphoric|uplift|energising|sativa|indica|psychoactive|intoxicating)\b/i;

const BUBBA_SLUG = "bubba-kush-cbd-hemp-flower";

const PHOTO_DIR = join(process.cwd(), "public/images/products/hemp-flower");

/**
 * Strain words from the file names of the third-party source photos. They
 * are marijuana strain names, so none may leak into a name, slug, SKU, alt
 * or line of copy, or into the seed file itself.
 */
const SOURCE_PHOTO_STRAINS = [
  "runtz",
  "wedding cake",
  "gelato",
  "alien og",
  "g13",
  "girl scout",
  "platinum og",
  "la confidential",
  "white fire",
  "black mamba",
  "black diamond",
  "bruce banner",
  "candyland",
  "frostbite",
  "mango haze",
  "strawberry cough",
  "tropicana",
  "blue cheese",
];

/** Photos that belong to the `hemp-flower-jar` house product, not a strain. */
const JAR_PRODUCT_PHOTOS = ["flower-jar.jpg", "flower-buds.jpg"];

function isFlowerPhoto(file: string): file is FlowerPhoto {
  return Object.hasOwn(FLOWER_PHOTOS, file);
}

/** "3.5 g" -> 3.5; the grams a jar-size variant name stands for. */
function gramsOf(name: string): number {
  const match = name.match(/^([\d.]+) g$/);
  expect(match, name).not.toBeNull();
  return Number(match?.[1]);
}

/** The default jar's size as it appears in the copy, regex-escaped. */
const BASE_SIZE_PATTERN = JAR_SIZES[0].name.replace(
  /[.*+?^${}()|[\]\\]/g,
  "\\$&",
);

describe("hemp flower seeds", () => {
  it("sells twenty-three strains in the hemp flower category", () => {
    expect(hempFlowerSeeds).toHaveLength(23);
    for (const seed of hempFlowerSeeds) {
      expect(seed.category, seed.slug).toBe("hemp-flower");
      expect(seed.sku, seed.slug).toMatch(/^HB-FLW-[A-Z]+$/);
      expect(seed.inventory, seed.slug).toBe(24);
      expect(seed.images, seed.slug).toHaveLength(1);
      const file = seed.images?.[0]?.file ?? "";
      expect(isFlowerPhoto(file), seed.slug).toBe(true);
      if (isFlowerPhoto(file)) {
        expect(seed.images?.[0]?.alt, seed.slug).toBe(FLOWER_PHOTOS[file]);
      }
    }
    const skus = hempFlowerSeeds.map((seed) => seed.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("keeps FLOWER_PHOTOS and the photo directory in step", () => {
    const keys = Object.keys(FLOWER_PHOTOS);
    for (const file of keys) {
      expect(existsSync(join(PHOTO_DIR, file)), file).toBe(true);
    }
    expect(readdirSync(PHOTO_DIR).sort()).toEqual([...keys].sort());
  });

  it("gives every strain its own photo", () => {
    const files = hempFlowerSeeds.map((seed) => seed.images?.[0]?.file ?? "");
    expect(new Set(files).size).toBe(files.length);
    for (const file of JAR_PRODUCT_PHOTOS) {
      expect(files).not.toContain(file);
    }
  });

  it("offers five jar sizes at rising prices and falling price per gram", () => {
    for (const seed of hempFlowerSeeds) {
      expect(
        seed.variants.map((variant) => [variant.key, variant.name]),
        seed.slug,
      ).toEqual([
        ["3-5g", "3.5 g"],
        ["7g", "7 g"],
        ["14g", "14 g"],
        ["28g", "28 g"],
        ["56g", "56 g"],
      ]);
      const prices = seed.variants.map((variant) => variant.priceCents);
      const perGram = seed.variants.map(
        (variant) => variant.priceCents / gramsOf(variant.name),
      );
      for (let i = 1; i < prices.length; i += 1) {
        expect(prices[i], `${seed.slug} ${i}`).toBeGreaterThan(
          prices[i - 1] ?? 0,
        );
        expect(perGram[i], `${seed.slug} ${i}`).toBeLessThan(
          perGram[i - 1] ?? 0,
        );
      }
      for (const price of prices) {
        expect(price % 100, seed.slug).toBe(0);
      }
      expect(
        seed.variants.map((variant) => variant.inventory),
        seed.slug,
      ).toEqual(JAR_SIZES.map((size) => size.stock));
    }
  });

  it("derives strengthMg from the default jar and the CBD percentage in the copy", () => {
    const clause = new RegExp(
      `about (\\d+)% CBD, roughly (\\d+) mg per ${BASE_SIZE_PATTERN}`,
    );
    for (const seed of hempFlowerSeeds) {
      const match = seed.description[1].match(clause);
      expect(match, seed.slug).not.toBeNull();
      const cbdPercent = Number(match?.[1]);
      const grams = gramsOf(seed.variants[0]?.name ?? "");
      expect(seed.specs?.strengthMg, seed.slug).toBe(
        (grams * 1000 * cbdPercent) / 100,
      );
      expect(Number.isInteger(seed.specs?.strengthMg), seed.slug).toBe(true);
      expect(Number(match?.[2]), seed.slug).toBe(seed.specs?.strengthMg);
      expect(seed.specs, seed.slug).toMatchObject({
        spectrum: "full",
        labTested: true,
        servingSize: "as needed",
        ingredients: ["hemp flower"],
      });
    }
  });

  it("dates the strains every 3 days from 2026-04-03", () => {
    const day = 24 * 60 * 60 * 1000;
    hempFlowerSeeds.forEach((seed, index) => {
      expect(
        Date.parse(seed.createdAt) - Date.parse("2026-04-03T10:00:00.000Z"),
        seed.slug,
      ).toBe(index * 3 * day);
    });
  });

  it("follows the copy rules", () => {
    for (const seed of hempFlowerSeeds) {
      expect(seed.images?.[0]?.alt, seed.slug).toMatch(/^Dried flower buds/);
      expect(seed.shortDescription, seed.slug).toMatch(/^[^.]+(\.\d[^.]*)*\.$/);
      expect(
        seed.shortDescription.endsWith(`in ${JAR_RANGE} jars.`),
        seed.slug,
      ).toBe(true);
      expect(seed.description, seed.slug).toHaveLength(2);
      for (const paragraph of seed.description) {
        expect(paragraph.length, seed.slug).toBeGreaterThan(80);
      }
    }
  });

  it("names every strain consistently", () => {
    expect(flowerRows).toHaveLength(hempFlowerSeeds.length);
    flowerRows.forEach((row, index) => {
      const seed = hempFlowerSeeds[index];
      expect(seed?.slug, row.slug).toBe(row.slug);
      expect(row.name.startsWith(row.strain), row.slug).toBe(true);
      expect(seed?.shortDescription, row.slug).toContain(row.strain);
      expect(row.slug, row.slug).toMatch(/-hemp-flower$/);
      expect(row.key, row.slug).toMatch(/^[A-Z]+$/);
    });
    const slugs = flowerRows.map((row) => row.slug);
    const keys = flowerRows.map((row) => row.key);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps the source photos' strain names out of code and copy", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/db/seed-data/catalog-flower.ts"),
      "utf8",
    )
      .toLowerCase()
      .replace(/[-_]/g, " ");
    for (const word of SOURCE_PHOTO_STRAINS) {
      expect(source, word).not.toContain(word);
    }
    for (const seed of hempFlowerSeeds) {
      const lines = [
        seed.name,
        seed.slug.replace(/-/g, " "),
        seed.sku,
        seed.shortDescription,
        ...seed.description,
        seed.images?.[0]?.alt ?? "",
      ].map((line) => line.toLowerCase());
      for (const line of lines) {
        for (const word of SOURCE_PHOTO_STRAINS) {
          expect(line, `${seed.slug}: ${word}`).not.toContain(word);
        }
      }
    }
  });

  it("keeps the banned words out of every line of copy", () => {
    for (const seed of hempFlowerSeeds) {
      const copy = [
        seed.shortDescription,
        ...seed.description,
        seed.images?.[0]?.alt ?? "",
      ];
      for (const line of copy) {
        expect(line, `${seed.slug}: ${line}`).not.toMatch(bannedWords);
      }
      if (seed.slug === BUBBA_SLUG) {
        expect(seed.name).toBe("Bubba Kush CBD hemp flower");
      } else {
        expect(seed.name, seed.slug).not.toMatch(bannedWords);
      }
    }
  });
});
