import type { Metadata } from "next";
import { CategoryProductRow } from "@/components/catalog/category-product-row";
import { CategoryRail } from "@/components/catalog/category-rail";
import { Container } from "@/components/layout/container";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { FeatureBand } from "@/components/marketing/feature-band";
import { PromoBanner } from "@/components/marketing/promo-banner";
import { TrustFeatures } from "@/components/marketing/trust-features";
import { siteConfig } from "@/lib/site-config";
import { categoryService } from "@/services/category.service";
import { contentService } from "@/services/content.service";
import { productService } from "@/services/product.service";
import type { CategoryRef, ProductSummary } from "@/types/catalog";

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
};

const ROW_PRODUCT_LIMIT = 4;
const FAQ_PREVIEW_LIMIT = 6;

interface CategoryRow {
  category: CategoryRef;
  products: ProductSummary[];
}

export default async function HomePage() {
  const content = await contentService.getHomeContent();
  const [promoProduct, categories, faqItems, rowResults] = await Promise.all([
    productService.getProductBySlug(content.promoBanner.productSlug),
    categoryService.listCategories(),
    contentService.getFaqItems(),
    Promise.all(
      content.categoryRowSlugs.map((slug) =>
        productService.listProducts({
          category: slug,
          pageSize: ROW_PRODUCT_LIMIT,
          sort: "featured",
          inStock: true,
        }),
      ),
    ),
  ]);

  if (!promoProduct) {
    console.error(
      `Home promo product "${content.promoBanner.productSlug}" was not found; the banner links to /shop instead.`,
    );
  }

  const rows = content.categoryRowSlugs.flatMap<CategoryRow>((slug, index) => {
    const category = categories.find((c) => c.slug === slug);
    const result = rowResults[index];
    if (!category || !result) {
      console.error(`Home category row "${slug}" was not found; skipping it.`);
      return [];
    }
    const { id, name } = category;
    return [{ category: { id, name, slug }, products: result.items }];
  });

  const [labBand, batchBand] = content.bands;

  return (
    <>
      <PromoBanner content={content.promoBanner} product={promoProduct} />

      <CategoryRail categories={categories} />

      <FeatureBand band={labBand} />

      <Container className="py-6 md:py-10">
        {rows.map((row) => (
          <CategoryProductRow
            key={row.category.id}
            category={row.category}
            products={row.products}
          />
        ))}
      </Container>

      <FeatureBand band={batchBand} />

      <section aria-labelledby="faq-heading" className="py-12 md:py-16">
        <Container>
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            <h2 id="faq-heading" className="text-center text-3xl">
              Common questions
            </h2>
            <FAQAccordion
              items={faqItems}
              limit={FAQ_PREVIEW_LIMIT}
              moreHref="/faq"
              moreAlign="center"
              defaultOpenFirst
            />
          </div>
        </Container>
      </section>

      <TrustFeatures features={content.trustFeatures} />
    </>
  );
}
