import type { Metadata } from "next";
import { ProseLayout } from "@/components/layout/prose-layout";
import { contentService } from "@/services/content.service";

export const metadata: Metadata = { title: "Terms" };

export default async function TermsPage() {
  const page = await contentService.getStaticPage("terms");
  if (!page) {
    throw new Error('Static page "terms" was not found.');
  }

  return <ProseLayout page={page} />;
}
