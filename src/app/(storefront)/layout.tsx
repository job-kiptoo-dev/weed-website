import type { ReactNode } from "react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { CategoryBar } from "@/components/layout/category-bar";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toast";
import { categoryService } from "@/services/category.service";
import type { CategoryRef } from "@/types/catalog";

// ISR for the statically prerendered storefront routes: catalog changes
// (reseeds, later admin edits) show within an hour. Phase 3 replaces this
// with Cache Components (`use cache` + tags), where `revalidate` errors.
export const revalidate = 3600;

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const categories = await categoryService.listCategories();
  const categoryRefs: CategoryRef[] = categories.map(({ id, name, slug }) => ({
    id,
    name,
    slug,
  }));

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-btn bg-surface px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <Providers>
        <AnnouncementBar />
        <Header categories={categoryRefs} />
        <CategoryBar categories={categoryRefs} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer categories={categoryRefs} />
        <CartDrawer />
        <Toaster />
      </Providers>
    </>
  );
}
