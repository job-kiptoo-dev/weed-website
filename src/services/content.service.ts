/**
 * Content service backed by the typed site copy in `src/content`. Pages read
 * site copy through this module so they never import it directly.
 */
import { getSiteContent, productFaqIds } from "@/content/site-content";
import type { FaqItem, HomeContent, StaticPage } from "@/types/content";

async function getHomeContent(): Promise<HomeContent> {
  await Promise.resolve();
  return getSiteContent().homeContent;
}

async function getFaqItems(): Promise<FaqItem[]> {
  await Promise.resolve();
  return getSiteContent().faqItems;
}

async function getProductFaqItems(): Promise<FaqItem[]> {
  await Promise.resolve();
  const { faqItems } = getSiteContent();
  return productFaqIds.flatMap((id) => {
    const item = faqItems.find((faq) => faq.id === id);
    return item ? [item] : [];
  });
}

async function getStaticPage(slug: string): Promise<StaticPage | null> {
  await Promise.resolve();
  return (
    getSiteContent().staticPages.find((page) => page.slug === slug) ?? null
  );
}

export const contentService = {
  getHomeContent,
  getFaqItems,
  getProductFaqItems,
  getStaticPage,
};
