import { cn } from "@/lib/cn";
import type { ProductSpecs, Spectrum } from "@/types/catalog";

interface SpecSheetProps {
  specs: ProductSpecs | null;
  variant?: "compact" | "full";
  className?: string;
}

const spectrumLabels: Record<Spectrum, string> = {
  full: "Full spectrum",
  broad: "Broad spectrum",
  isolate: "Isolate",
};

interface SpecRow {
  label: string;
  value: string;
}

export function SpecSheet({
  specs,
  variant = "compact",
  className,
}: SpecSheetProps) {
  if (!specs) return null;

  const rows: SpecRow[] = [
    { label: "Strength", value: `${specs.strengthMg} mg` },
    { label: "Spectrum", value: spectrumLabels[specs.spectrum] },
    {
      label: "Lab tested",
      value: specs.labTested ? "Yes, third party" : "No",
    },
  ];
  if (variant === "full") {
    rows.push(
      { label: "Serving", value: specs.servingSize },
      { label: "Ingredients", value: specs.ingredients.join(", ") },
    );
  }

  return (
    <dl className={cn("text-sm", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-t border-line py-2"
        >
          <dt className="whitespace-nowrap text-ink-muted">{row.label}</dt>
          <dd className="text-right break-words text-ink tabular-nums">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
