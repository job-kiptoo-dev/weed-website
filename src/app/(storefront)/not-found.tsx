import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl tracking-display md:text-5xl">Page not found</h1>
      <p className="max-w-md text-lg text-ink-muted">
        The page you are looking for has moved or never existed. Try the shop or
        head back to the start.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/">Go home</Button>
        <Button href="/shop" variant="secondary">
          Browse the shop
        </Button>
      </div>
    </Container>
  );
}
