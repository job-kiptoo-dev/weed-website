import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { StaticPage } from "@/types/content";
import { Container } from "./container";

interface ProseLayoutProps {
  page: StaticPage;
  /** Rendered after the page sections, inside the same measure. */
  children?: ReactNode;
  className?: string;
}

export function ProseLayout({ page, children, className }: ProseLayoutProps) {
  return (
    <Container className={cn("py-10 md:py-14", className)}>
      <article className="flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl tracking-display md:text-5xl">
            {page.title}
          </h1>
          <p className="text-lg leading-relaxed text-ink-muted">{page.intro}</p>
        </header>
        {page.sections.map((section) => (
          <section
            key={section.heading}
            className="flex flex-col gap-3 leading-relaxed"
          >
            <h2 className="text-2xl">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-ink-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        {children}
      </article>
    </Container>
  );
}
