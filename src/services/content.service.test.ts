import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import { buildContent } from "@/mocks/content";
import { categoryService } from "./category.service";
import { contentService } from "./content.service";
import { productService } from "./product.service";

describe("contentService.getHomeContent", () => {
  it("points the promo banner at an active product on sale", async () => {
    const { promoBanner } = await contentService.getHomeContent();
    const product = await productService.getProductBySlug(
      promoBanner.productSlug,
    );
    expect(product).not.toBeNull();
    expect(product?.compareAtPriceCents ?? 0).toBeGreaterThan(
      product?.priceCents ?? 0,
    );
  });

  it("resolves every row category and uses self-hosted images", async () => {
    const content = await contentService.getHomeContent();
    for (const slug of content.categoryRowSlugs) {
      expect(
        await categoryService.getCategoryBySlug(slug),
        slug,
      ).not.toBeNull();
    }
    const imageUrls = [
      content.promoBanner.imageUrl,
      ...content.bands.map((band) => band.imageUrl),
    ];
    for (const url of imageUrls) {
      expect(url.startsWith("/images/"), url).toBe(true);
      expect(existsSync(join(process.cwd(), "public", url)), url).toBe(true);
    }
  });
});

describe("contentService age and smokable hemp copy", () => {
  it("states a minimum age of 21 in the notice, FAQ and terms", async () => {
    expect(siteConfig.legal.ageNotice).toBe("For adults 21 and over.");
    const faq = await contentService.getFaqItems();
    expect(faq.find((item) => item.id === "faq-age")?.answer).toContain(
      "21 or over",
    );
    const terms = await contentService.getStaticPage("terms");
    const eligibility = terms?.sections.find(
      (s) => s.heading === "Eligibility",
    );
    expect(eligibility?.paragraphs.join(" ")).toContain("21 or over");
  });

  it("includes the state-restriction FAQ, terms and pre-roll row while the feature is on", async () => {
    const faq = await contentService.getFaqItems();
    expect(faq.some((item) => item.id === "faq-smokable-hemp")).toBe(true);
    const terms = await contentService.getStaticPage("terms");
    expect(terms?.sections.map((s) => s.heading)).toContain("Smokable hemp");
    const home = await contentService.getHomeContent();
    expect(home.categoryRowSlugs).toEqual([
      "hemp-pre-rolls",
      "tinctures",
      "gummies-edibles",
    ]);
  });

  it("drops every smokable hemp mention while the feature is off", () => {
    const content = buildContent({ smokableHemp: false });
    expect(
      content.faqItems.some((item) => item.id === "faq-smokable-hemp"),
    ).toBe(false);
    expect(content.homeContent.categoryRowSlugs).not.toContain(
      "hemp-pre-rolls",
    );
    const text = JSON.stringify(content).toLowerCase();
    expect(text).not.toContain("smokable");
    expect(text).not.toContain("pre-roll");
  });
});
