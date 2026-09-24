import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContent } from "@/content/site-content";
import { isCategoryEnabled } from "@/lib/catalog-visibility";
import { buildSeedCatalog } from "@/lib/db/seed-data/catalog";
import { siteConfig, type FeatureFlags } from "@/lib/site-config";
import { contentService } from "./content.service";

/** Active seed products and enabled categories under `features`. */
function visibleSeedCatalog(features: FeatureFlags) {
  const catalog = buildSeedCatalog();
  const categories = catalog.categories.filter((c) =>
    isCategoryEnabled(c.slug, features),
  );
  const categoryIds = new Set(categories.map((c) => c.id));
  return {
    categories,
    products: catalog.products.filter(
      (p) => p.status === "active" && categoryIds.has(p.categoryId),
    ),
  };
}

describe("contentService.getHomeContent", () => {
  it("points the promo banner at an active product on sale", async () => {
    const { promoBanner } = await contentService.getHomeContent();
    const product = visibleSeedCatalog(siteConfig.features).products.find(
      (p) => p.slug === promoBanner.productSlug,
    );
    expect(product).toBeDefined();
    expect(product?.compareAtPriceCents ?? 0).toBeGreaterThan(
      product?.priceCents ?? 0,
    );
  });

  it("points the promo banner at a product visible under either flag", () => {
    for (const smokableHemp of [true, false]) {
      const features = { smokableHemp };
      const { promoBanner } = buildContent(features).homeContent;
      expect(
        visibleSeedCatalog(features).products.some(
          (p) => p.slug === promoBanner.productSlug,
        ),
        `smokableHemp=${smokableHemp}`,
      ).toBe(true);
    }
  });

  it("resolves every row category under either flag", () => {
    for (const smokableHemp of [true, false]) {
      const features = { smokableHemp };
      const slugs = new Set(
        visibleSeedCatalog(features).categories.map((c) => c.slug),
      );
      for (const slug of buildContent(features).homeContent.categoryRowSlugs) {
        expect(slugs.has(slug), `${slug} (smokableHemp=${smokableHemp})`).toBe(
          true,
        );
      }
    }
  });

  it("uses self-hosted images", async () => {
    const content = await contentService.getHomeContent();
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

  it("includes the state-restriction FAQ, terms and flower row while the feature is on", () => {
    const content = buildContent({ smokableHemp: true });
    expect(
      content.faqItems.some((item) => item.id === "faq-smokable-hemp"),
    ).toBe(true);
    const terms = content.staticPages.find((page) => page.slug === "terms");
    expect(terms?.sections.map((s) => s.heading)).toContain("Smokable hemp");
    expect(content.homeContent.categoryRowSlugs).toEqual([
      "hemp-flower",
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
    expect(content.homeContent.categoryRowSlugs).not.toContain("hemp-flower");
    const text = JSON.stringify(content).toLowerCase();
    expect(text).not.toContain("smokable");
    expect(text).not.toContain("pre-roll");
    expect(text).not.toContain("hemp flower");
    expect(text).not.toContain("hemp-flower");
  });
});

describe("copy fixes", () => {
  it("says honey straws, never honey sticks, in content and seed text", () => {
    const text = JSON.stringify([
      buildContent({ smokableHemp: true }),
      buildContent({ smokableHemp: false }),
      buildSeedCatalog(),
    ]).toLowerCase();
    expect(text).not.toMatch(/honey sticks?\b/);
    expect(text).toContain("honey straws");
  });

  it("uses the store contact email in the privacy page", async () => {
    const privacy = await contentService.getStaticPage("privacy");
    const contact = privacy?.sections.find((s) => s.heading === "Contact");
    expect(contact?.paragraphs.join(" ")).toContain(siteConfig.contact.email);
  });

  it("says what checkout collects, who sees it and how long it is kept", async () => {
    const privacy = await contentService.getStaticPage("privacy");
    const text = (privacy?.sections ?? [])
      .flatMap((section) => section.paragraphs)
      .join(" ");

    // What is collected, and why.
    expect(text).toMatch(/billing address and delivery address/i);
    expect(text).toMatch(/phone number/i);
    expect(text).toMatch(/what you ordered/i);
    // Zero PCI scope (spec R4): no card data is ever collected here.
    expect(text).toMatch(/never collect card numbers, CVV codes/i);
    expect(text).not.toMatch(/payment provider/i);
    // Who sees it, and retention.
    expect(text).toMatch(/emailed to the store owner's inbox/i);
    expect(text).toMatch(/order records.*for 7 years/i);
    expect(text).toMatch(/deleted when the account is deleted/i);
  });
});
