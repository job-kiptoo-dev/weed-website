import { notFound } from "next/navigation";
import { getCategory } from "./get-category";

/**
 * Resolves the category above the segment's `loading.tsx` boundary so an
 * unknown slug sets a real 404 status before the response starts streaming.
 */
export default async function CategoryLayout(
  props: LayoutProps<"/shop/[category]">,
) {
  const { category } = await props.params;
  if (!(await getCategory(category))) notFound();
  return props.children;
}
