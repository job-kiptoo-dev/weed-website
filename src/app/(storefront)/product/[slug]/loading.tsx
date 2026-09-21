import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

export default function ProductLoading() {
  return (
    <Container className="flex flex-col gap-14 py-8 md:py-12" aria-busy="true">
      <VisuallyHidden>Loading product</VisuallyHidden>
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full" />
          <div className="flex gap-3">
            <Skeleton className="size-20" />
            <Skeleton className="size-20" />
            <Skeleton className="size-20" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-13 w-full" />
        </div>
      </div>
    </Container>
  );
}
