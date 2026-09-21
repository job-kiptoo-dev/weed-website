import type { Metadata } from "next";
import { ProseLayout } from "@/components/layout/prose-layout";
import { contentService } from "@/services/content.service";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const page = await contentService.getStaticPage("privacy");
  if (!page) {
    throw new Error('Static page "privacy" was not found.');
  }

  return <ProseLayout page={page} />;
}
