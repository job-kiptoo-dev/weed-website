import { notFound } from "next/navigation";
import { getProduct } from "./get-product";

/**
 * Resolves the product above the segment's `loading.tsx` boundary so an
 * unknown or archived slug sets a real 404 status before streaming starts.
 */
export default async function ProductLayout(
  props: LayoutProps<"/product/[slug]">,
) {
  const { slug } = await props.params;
  if (!(await getProduct(slug))) notFound();
  return props.children;
}
