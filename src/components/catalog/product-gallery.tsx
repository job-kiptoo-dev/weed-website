"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { ProductImage } from "@/types/catalog";

interface ProductGalleryProps {
  images: ProductImage[];
  name: string;
  className?: string;
}

const MAIN_IMAGE_SIZES = "(min-width: 1024px) 50vw, 100vw";
const THUMB_IMAGE_SIZES = "96px";

export function ProductGallery({
  images,
  name,
  className,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbsRef = useRef<HTMLUListElement>(null);
  const active = images[activeIndex] ?? images[0];

  function select(index: number) {
    const next = (index + images.length) % images.length;
    setActiveIndex(next);
    const buttons = thumbsRef.current?.querySelectorAll("button");
    buttons?.[next]?.focus();
  }

  function handleThumbKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      select(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      select(index - 1);
    }
  }

  if (!active) {
    return (
      <div
        aria-hidden="true"
        className={cn("aspect-square rounded-card bg-brand-soft", className)}
      />
    );
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${name} images`}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-brand-soft">
        <Image
          key={active.id}
          src={active.url}
          alt={active.alt}
          fill
          preload={activeIndex === 0}
          sizes={MAIN_IMAGE_SIZES}
          className="object-cover"
        />
      </div>
      {images.length > 1 ? (
        <ul ref={thumbsRef} className="flex gap-3 overflow-x-auto py-1">
          {images.map((image, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Show image ${index + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={(event) => handleThumbKeyDown(event, index)}
                  className={cn(
                    "relative block size-20 overflow-hidden rounded-btn border-2 bg-brand-soft transition-colors",
                    isActive
                      ? "border-brand"
                      : "border-transparent hover:border-line",
                  )}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes={THUMB_IMAGE_SIZES}
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
