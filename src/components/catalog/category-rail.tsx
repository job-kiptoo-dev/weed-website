import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Leaf } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Category } from "@/types/catalog";

interface CategoryRailProps {
  categories: Pick<Category, "id" | "name" | "slug" | "imageUrl">[];
  className?: string;
}

export function CategoryRail({ categories, className }: CategoryRailProps) {
  return (
    <section
      aria-labelledby="categories-heading"
      className={cn("py-12 md:py-16", className)}
    >
      <Container className="flex flex-col gap-6">
        <h2 id="categories-heading" className="text-3xl">
          Shop by category
        </h2>
        {/* `p-1` keeps focus rings visible: overflow-x-auto also clips vertically. */}
        <ul className="-mx-4 flex [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain p-1 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] lg:overflow-visible lg:px-1">
          {categories.map((category) => (
            <li key={category.id} className="shrink-0">
              <Link
                href={`/shop/${category.slug}`}
                className="group flex w-24 flex-col items-center gap-2 rounded-btn lg:w-auto"
              >
                <span className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-line bg-brand-soft transition-colors group-hover:border-accent lg:size-24 xl:size-28">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <Leaf className="size-8 text-brand" />
                  )}
                </span>
                <span className="text-center text-sm font-medium text-ink">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
