import type { Metadata } from "next";
import { ProseLayout } from "@/components/layout/prose-layout";
import { contentService } from "@/services/content.service";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const page = await contentService.getStaticPage("about");
  if (!page) {
    throw new Error('Static page "about" was not found.');
  }

  return <ProseLayout page={page} />;
}
