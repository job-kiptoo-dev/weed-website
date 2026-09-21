import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { FaqItem } from "@/types/content";

interface FAQAccordionProps {
  items: FaqItem[];
  limit?: number;
  moreHref?: string;
  moreLabel?: string;
  /** Horizontal alignment of the "Read all questions" link. */
  moreAlign?: "start" | "center";
  /** Opens the first visible question on load. */
  defaultOpenFirst?: boolean;
  className?: string;
}

export function FAQAccordion({
  items,
  limit,
  moreHref,
  moreLabel = "Read all questions",
  moreAlign = "start",
  defaultOpenFirst = false,
  className,
}: FAQAccordionProps) {
  const visible = limit === undefined ? items : items.slice(0, limit);
  const accordionItems = visible.map((item) => ({
    id: item.id,
    title: item.question,
    content: <p>{item.answer}</p>,
  }));
  const firstId = visible[0]?.id;
  const defaultOpenIds =
    defaultOpenFirst && firstId !== undefined ? [firstId] : undefined;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Accordion items={accordionItems} defaultOpenIds={defaultOpenIds} />
      {moreHref && items.length > visible.length ? (
        <Button
          href={moreHref}
          variant="secondary"
          className={moreAlign === "center" ? "self-center" : "self-start"}
        >
          {moreLabel}
        </Button>
      ) : null}
    </div>
  );
}
