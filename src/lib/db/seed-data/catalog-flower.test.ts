// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hempFlowerSeeds } from "./catalog-flower";

/**
 * Words the flower copy must not use: legal risk (other cannabinoids and
 * plant names), effect and health claims, and gear talk. "Bubba Kush CBD" is
 * the strain's real name, so `kush` is allowed in that product's name and
 * slug only.
 */
const bannedWords =
  /\b(thc|cannabis|marijuana|weed|kush|smoke|smoking|toke|hit|herb|dab|hash|high|potency|wellness|relief|sleep|treat|cure|buzz|stoned|relax|calm|euphoric|uplift|energising|sativa|indica|psychoactive|intoxicating)\b/i;

const BUBBA_SLUG = "bubba-kush-cbd-hemp-flower";

describe("hemp flower seeds", () => {
  it("sells eight strains in the hemp flower category", () => {
    expect(hempFlowerSeeds).toHaveLength(8);
    for (const seed of hempFlowerSeeds) {
      expect(seed.category, seed.slug).toBe("hemp-flower");
      expect(seed.sku, seed.slug).toMatch(/^HB-FLW-[A-Z]+$/);
      expect(seed.inventory, seed.slug).toBe(24);
      expect(seed.images, seed.slug).toHaveLength(1);
      expect(seed.images?.[0]?.file, seed.slug).toBe(`${seed.slug}.jpg`);
    }
    const skus = hempFlowerSeeds.map((seed) => seed.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("offers four jar sizes at rising prices", () => {
    for (const seed of hempFlowerSeeds) {
      expect(
        seed.variants.map((variant) => [variant.key, variant.name]),
        seed.slug,
      ).toEqual([
        ["3-5g", "3.5 g"],
        ["7g", "7 g"],
        ["14g", "14 g"],
        ["28g", "28 g"],
      ]);
      const prices = seed.variants.map((variant) => variant.priceCents);
      for (let i = 1; i < prices.length; i += 1) {
        expect(prices[i], `${seed.slug} ${i}`).toBeGreaterThan(
          prices[i - 1] ?? 0,
        );
      }
    }
  });

  it("derives strengthMg from the CBD percentage in the copy", () => {
    for (const seed of hempFlowerSeeds) {
      const match = seed.description[1].match(
        /about (\d+)% CBD, roughly (\d+) mg per 3\.5 g/,
      );
      expect(match, seed.slug).not.toBeNull();
      const cbdPercent = Number(match?.[1]);
      expect(seed.specs?.strengthMg, seed.slug).toBe((3500 * cbdPercent) / 100);
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
      expect(seed.description, seed.slug).toHaveLength(2);
      for (const paragraph of seed.description) {
        expect(paragraph.length, seed.slug).toBeGreaterThan(80);
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
