import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopListing } from "@/components/catalog/shop-listing";
import { parseShopQuery } from "@/lib/shop-query";
import { categoryService } from "@/services/category.service";
import { getCategory } from "./get-category";

export async function generateStaticParams() {
  const categories = await categoryService.listCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata(
  props: PageProps<"/shop/[category]">,
): Promise<Metadata> {
  const { category } = await props.params;
  const cat = await getCategory(category);
  if (!cat) return { title: "Category not found" };
  return { title: cat.name, description: cat.description };
}

export default async function CategoryPage(
  props: PageProps<"/shop/[category]">,
) {
  const { category } = await props.params;
  const cat = await getCategory(category);
  if (!cat) notFound();

  const query = parseShopQuery(await props.searchParams);

  return (
    <ShopListing
      query={query}
      category={cat}
      basePath={`/shop/${cat.slug}`}
      title={cat.name}
      description={cat.description}
    />
  );
}
