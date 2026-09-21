import Link from "next/link";
import { Leaf } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";
import type { CategoryRef } from "@/types/catalog";
import { Container } from "./container";
import { Newsletter } from "./newsletter";

interface FooterProps {
  categories: CategoryRef[];
  className?: string;
}

const footerLinkClass =
  "text-on-brand-muted hover:text-on-brand hover:underline";
const headingClass = "font-sans text-base font-medium text-on-brand";

export function Footer({ categories, className }: FooterProps) {
  const year = new Date().getFullYear();
  const { contact, social, legal, quickLinks } = siteConfig;
  const shopLinks = [
    ...categories.map((category) => ({
      label: category.name,
      href: `/shop/${category.slug}`,
    })),
    { label: "All products", href: "/shop" },
  ];

  return (
    <footer
      className={cn("bg-brand text-on-brand focus-scope-dark", className)}
      aria-label="Site footer"
    >
      <Container className="flex flex-col gap-10 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 self-start rounded-btn font-display text-xl font-semibold text-on-brand"
            >
              <Leaf className="text-accent" />
              {siteConfig.name}
            </Link>
            <p className="max-w-sm text-sm text-on-brand-muted">
              {siteConfig.description}
            </p>
            <ul className="flex gap-4 text-sm">
              {social.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={footerLinkClass}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <nav aria-label="Shop">
            <h2 className={headingClass}>Shop</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Quick links">
            <h2 className={headingClass}>Quick links</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <section
            aria-labelledby="footer-contact-heading"
            className="flex flex-col gap-6"
          >
            <div>
              <h2 id="footer-contact-heading" className={headingClass}>
                Contact info
              </h2>
              <address className="mt-3 flex flex-col gap-1 text-sm text-on-brand-muted not-italic">
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-on-brand hover:underline"
                >
                  {contact.email}
                </a>
                <a
                  href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                  className="hover:text-on-brand hover:underline"
                >
                  {contact.phone}
                </a>
                {contact.address.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </address>
            </div>
            <Newsletter />
          </section>
        </div>
        <div className="flex flex-col gap-3 border-t-2 border-accent pt-6 text-sm text-on-brand-muted">
          <p>{legal.disclaimer}</p>
          <p>{legal.ageNotice}</p>
          <p className="text-center">
            &copy; {year} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
