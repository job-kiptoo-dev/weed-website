import { Container } from "@/components/layout/container";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { TrustFeature } from "@/types/content";

interface TrustFeaturesProps {
  features: TrustFeature[];
  className?: string;
}

export function TrustFeatures({ features, className }: TrustFeaturesProps) {
  return (
    <section
      aria-label="Why shop with us"
      className={cn("border-y border-line bg-surface", className)}
    >
      <Container className="py-6">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-3">
              <Icon name={feature.icon} className="mt-0.5 size-5 text-brand" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-ink">{feature.title}</p>
                <p className="hidden text-sm text-ink-muted sm:block">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
