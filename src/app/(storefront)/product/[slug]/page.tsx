import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductPurchasePanel } from "@/components/catalog/product-purchase-panel";
import { RatingStars } from "@/components/catalog/rating-stars";
import { RelatedProducts } from "@/components/catalog/related-products";
import { ReviewList } from "@/components/catalog/review-list";
import { SpecSheet } from "@/components/catalog/spec-sheet";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container } from "@/components/layout/container";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { Refresh, Truck } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";
import { contentService } from "@/services/content.service";
import { getProduct } from "./get-product";

const FAQ_LIMIT = 3;
const RETURN_WINDOW_DAYS = 30;

export async function generateMetadata(
  props: PageProps<"/product/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.shortDescription };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const faqItems = await contentService.getProductFaqItems();
  const paragraphs = product.description
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: product.category.name, href: `/shop/${product.category.slug}` },
    { label: product.name },
  ];

  return (
    <Container className="flex flex-col gap-14 py-8 md:gap-20 md:py-12">
      <Breadcrumbs items={crumbs} />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl tracking-display md:text-4xl">
              {product.name}
            </h1>
            {product.reviewCount > 0 ? (
              <RatingStars
                value={product.ratingAverage}
                count={product.reviewCount}
              />
            ) : null}
            <p className="text-lg text-ink-muted">{product.shortDescription}</p>
          </div>
          <ProductPurchasePanel product={product} />
          {product.specs ? (
            <section
              aria-labelledby="specs-heading"
              className="flex flex-col gap-2"
            >
              <h2
                id="specs-heading"
                className="font-sans text-base font-medium"
              >
                Details
              </h2>
              <SpecSheet specs={product.specs} variant="full" />
            </section>
          ) : null}
        </div>
      </div>

      <section aria-labelledby="description-heading" className="max-w-3xl">
        <h2 id="description-heading" className="text-3xl">
          About this product
        </h2>
        <div className="mt-4 flex flex-col gap-4 text-lg text-ink-muted">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="shipping-heading" className="max-w-3xl">
        <h2 id="shipping-heading" className="text-3xl">
          Shipping and returns
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-ink-muted">
          <li className="flex items-start gap-3">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand" />
            <span>
              {siteConfig.shipping.estimateText}. Shipping is free on orders
              over {formatMoney(siteConfig.shipping.freeThresholdCents)} and{" "}
              {formatMoney(siteConfig.shipping.flatRateCents)} otherwise.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Refresh className="mt-0.5 size-5 shrink-0 text-brand" />
            <span>
              Unopened products can be returned within {RETURN_WINDOW_DAYS} days
              of delivery for a full refund.
            </span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="faq-heading" className="max-w-3xl">
        <h2 id="faq-heading" className="text-3xl">
          Common questions
        </h2>
        <FAQAccordion
          items={faqItems}
          limit={FAQ_LIMIT}
          moreHref="/faq"
          className="mt-4"
        />
      </section>

      <ReviewList
        reviews={product.reviews}
        ratingAverage={product.ratingAverage}
        reviewCount={product.reviewCount}
        className="max-w-3xl"
      />

      <RelatedProducts productId={product.id} />
    </Container>
  );
}
