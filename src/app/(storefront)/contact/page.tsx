import type { Metadata } from "next";
import { ContactForm } from "@/components/layout/contact-form";
import { Container } from "@/components/layout/container";
import { siteConfig } from "@/lib/site-config";
import { contentService } from "@/services/content.service";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const page = await contentService.getStaticPage("contact");
  if (!page) {
    throw new Error('Static page "contact" was not found.');
  }
  const { contact } = siteConfig;

  return (
    <Container className="flex flex-col gap-10 py-10 md:py-14">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-4xl tracking-display md:text-5xl">{page.title}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{page.intro}</p>
      </header>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        <section
          aria-labelledby="contact-details-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="contact-details-heading" className="text-2xl">
            Other ways to reach us
          </h2>
          <address className="flex flex-col gap-4 text-ink-muted not-italic">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Email</span>
              <a
                href={`mailto:${contact.email}`}
                className="self-start hover:text-ink hover:underline"
              >
                {contact.email}
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Phone</span>
              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                className="self-start hover:text-ink hover:underline"
              >
                {contact.phone}
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Address</span>
              {contact.address.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </address>
        </section>
        <section
          aria-labelledby="contact-form-heading"
          className="max-w-2xl rounded-card border border-line bg-surface p-6"
        >
          <h2 id="contact-form-heading" className="mb-4 text-2xl">
            Send us a message
          </h2>
          <ContactForm />
        </section>
      </div>
    </Container>
  );
}
