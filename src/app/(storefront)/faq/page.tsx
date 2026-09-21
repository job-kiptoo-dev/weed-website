import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Accordion } from "@/components/ui/accordion";
import { contentService } from "@/services/content.service";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const faqItems = await contentService.getFaqItems();
  const items = faqItems.map((item) => ({
    id: item.id,
    title: item.question,
    content: <p>{item.answer}</p>,
  }));

  return (
    <Container className="py-10 md:py-14">
      <div className="flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl tracking-display md:text-5xl">
            Frequently asked questions
          </h1>
          <p className="text-lg leading-relaxed text-ink-muted">
            Shipping, returns, lab reports and how to read our labels. If your
            question is not here, send us a message from the contact page.
          </p>
        </header>
        <Accordion items={items} allowMultiple />
      </div>
    </Container>
  );
}
