import Image from "next/image";
import { Price } from "@/components/catalog/price";
import { SpecSheet } from "@/components/catalog/spec-sheet";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ProductSummary } from "@/types/catalog";
import type { PromoBannerContent } from "@/types/content";

interface PromoBannerProps {
  content: PromoBannerContent;
  /** `null` when the promo product is missing: the banner degrades to a shop link. */
  product: ProductSummary | null;
  className?: string;
}

const REVEAL_STEP_MS = 60;

function revealStyle(index: number) {
  return { animationDelay: `${index * REVEAL_STEP_MS}ms` };
}

export function PromoBanner({ content, product, className }: PromoBannerProps) {
  return (
    <section
      aria-labelledby="promo-heading"
      className={cn(
        "w-full bg-accent text-on-accent focus-scope-accent",
        className,
      )}
    >
      <Container className="grid items-center gap-8 py-10 md:py-14 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start gap-6">
          <h1
            id="promo-heading"
            className="text-4xl tracking-display motion-safe:animate-reveal md:text-5xl"
            style={revealStyle(0)}
          >
            {content.title}
          </h1>
          <p
            className="max-w-xl text-lg motion-safe:animate-reveal"
            style={revealStyle(1)}
          >
            {content.subtitle}
          </p>
          <div className="motion-safe:animate-reveal" style={revealStyle(2)}>
            {product ? (
              <Button href={`/product/${product.slug}`} size="lg">
                {content.ctaLabel}
              </Button>
            ) : (
              <Button href="/shop" size="lg">
                Browse all products
              </Button>
            )}
          </div>
        </div>
        <div className="relative flex flex-col gap-4">
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-card bg-brand-soft motion-safe:animate-reveal md:max-h-[420px]"
            style={revealStyle(3)}
          >
            <Image
              src={content.imageUrl}
              alt={content.imageAlt}
              fill
              preload
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          {product ? (
            <div
              className="flex min-w-64 flex-col gap-2 rounded-card bg-surface p-4 text-ink shadow-elevation motion-safe:animate-reveal lg:absolute lg:-right-6 lg:-bottom-6 lg:max-w-xs"
              style={revealStyle(4)}
            >
              <p className="text-lg font-medium">{product.name}</p>
              <Price
                priceCents={product.priceCents}
                compareAtPriceCents={product.compareAtPriceCents}
              />
              <SpecSheet specs={product.specs} />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
