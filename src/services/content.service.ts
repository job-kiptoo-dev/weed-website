/**
 * Phase 1 content service backed by `src/mocks/content`. Pages read site copy
 * through this module so they never import mocks directly.
 */
import {
  faqItems,
  homeContent,
  productFaqIds,
  staticPages,
} from "@/mocks/content";
import type { FaqItem, HomeContent, StaticPage } from "@/types/content";

async function getHomeContent(): Promise<HomeContent> {
  await Promise.resolve();
  return homeContent;
}

async function getFaqItems(): Promise<FaqItem[]> {
  await Promise.resolve();
  return faqItems;
}

async function getProductFaqItems(): Promise<FaqItem[]> {
  await Promise.resolve();
  return productFaqIds.flatMap((id) => {
    const item = faqItems.find((faq) => faq.id === id);
    return item ? [item] : [];
  });
}

async function getStaticPage(slug: string): Promise<StaticPage | null> {
  await Promise.resolve();
  return staticPages.find((page) => page.slug === slug) ?? null;
}

export const contentService = {
  getHomeContent,
  getFaqItems,
  getProductFaqItems,
  getStaticPage,
};
