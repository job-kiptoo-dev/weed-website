import Image from "next/image";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { FeatureBandContent } from "@/types/content";

interface FeatureBandProps {
  band: FeatureBandContent;
  className?: string;
}

export function FeatureBand({ band, className }: FeatureBandProps) {
  const headingId = `${band.id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "w-full bg-brand text-on-brand focus-scope-dark",
        className,
      )}
    >
      <Container className="grid items-center gap-8 py-14 md:py-20 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <h2 id={headingId} className="text-3xl md:text-4xl">
            {band.title}
          </h2>
          {band.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-lg text-on-brand-muted">
              {paragraph}
            </p>
          ))}
          {band.cta ? (
            <Button href={band.cta.href} variant="accent" className="mt-1">
              {band.cta.label}
            </Button>
          ) : null}
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-brand-hover">
          <Image
            src={band.imageUrl}
            alt={band.imageAlt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
      </Container>
    </section>
  );
}
