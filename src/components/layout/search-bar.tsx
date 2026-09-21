"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Close, Search } from "@/components/ui/icons";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { SearchSuggestion } from "@/types/catalog";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

interface SuggestionResult {
  /** The query this result answers; compared against the current query. */
  query: string;
  suggestions: SearchSuggestion[];
  error: string | null;
}

const MIN_QUERY_LENGTH = 2;
const UNAVAILABLE_MESSAGE = "Search is unavailable right now";
const INITIAL_RESULT: SuggestionResult = {
  query: "",
  suggestions: [],
  error: null,
};

function isSuggestionsResponse(
  value: unknown,
): value is { suggestions: SearchSuggestion[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "suggestions" in value &&
    Array.isArray(value.suggestions)
  );
}

async function fetchSuggestions(
  query: string,
  signal: AbortSignal,
): Promise<SearchSuggestion[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Search request failed (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  if (!isSuggestionsResponse(data)) {
    throw new Error("Search request failed (unexpected response).");
  }
  return data.suggestions;
}

export function SearchBar({
  placeholder = "Search products",
  className,
}: SearchBarProps) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [result, setResult] = useState<SuggestionResult>(INITIAL_RESULT);
  const query = useDebounce(value, 250).trim();

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    fetchSuggestions(query, controller.signal)
      .then((suggestions) => {
        setResult({ query, suggestions, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Search: failed to load suggestions.", error);
        setResult({ query, suggestions: [], error: UNAVAILABLE_MESSAGE });
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!open && !expanded) return;
    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, expanded]);

  const hasQuery = query.length >= MIN_QUERY_LENGTH;
  const current = hasQuery && result.query === query ? result : null;
  const suggestions = current?.suggestions ?? [];
  const error = current?.error ?? null;
  const listOpen = open && suggestions.length > 0;
  const active =
    listOpen && activeIndex < suggestions.length ? activeIndex : -1;
  const activeId = active >= 0 ? `${listboxId}-option-${active}` : undefined;

  function navigate(href: string) {
    setOpen(false);
    setExpanded(false);
    router.push(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeSuggestion = active >= 0 ? suggestions[active] : undefined;
    if (activeSuggestion) {
      navigate(activeSuggestion.href);
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        if (suggestions.length === 0) return;
        event.preventDefault();
        setOpen(true);
        setActiveIndex((active + 1) % suggestions.length);
        break;
      case "ArrowUp":
        if (suggestions.length === 0) return;
        event.preventDefault();
        setOpen(true);
        setActiveIndex((active - 1 + suggestions.length) % suggestions.length);
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        } else if (expanded) {
          setExpanded(false);
        }
        break;
    }
  }

  function expand() {
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={handleSubmit}
      className={cn("relative", className)}
    >
      <button
        type="button"
        aria-label="Open search"
        aria-expanded={expanded}
        onClick={expand}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-btn text-on-brand hover:bg-white/10 md:hidden",
          expanded && "hidden",
        )}
      >
        <Search />
      </button>
      <div
        className={cn(
          "items-center gap-2 md:flex",
          expanded
            ? "fixed inset-x-0 top-0 z-50 flex h-16 border-b border-white/10 bg-brand px-4 md:static md:h-auto md:border-0 md:bg-transparent md:px-0"
            : "hidden",
        )}
      >
        <div className="relative flex-1 md:w-64 lg:w-48 xl:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <label htmlFor={`${listboxId}-input`} className="sr-only">
            Search products
          </label>
          <input
            ref={inputRef}
            id={`${listboxId}-input`}
            type="search"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="h-10 w-full rounded-input border border-transparent bg-surface pr-3 pl-9 text-base text-ink placeholder:text-ink-muted/70 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <button
          type="button"
          aria-label="Close search"
          onClick={() => setExpanded(false)}
          className="inline-flex size-10 items-center justify-center rounded-btn text-on-brand hover:bg-white/10 md:hidden"
        >
          <Close />
        </button>
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          hidden={!listOpen}
          className="absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-card border border-line bg-surface p-2 shadow-elevation md:left-auto md:w-80"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.href}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => navigate(suggestion.href)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-btn px-2 py-2",
                index === active && "bg-brand-soft",
              )}
            >
              {suggestion.imageUrl ? (
                <Image
                  src={suggestion.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  sizes="40px"
                  className="size-10 shrink-0 rounded-btn object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-10 shrink-0 rounded-btn bg-brand-soft"
                />
              )}
              <span className="min-w-0 flex-1 truncate text-ink">
                {suggestion.label}
              </span>
              {suggestion.priceCents !== null ? (
                <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                  {formatMoney(suggestion.priceCents)}
                </span>
              ) : (
                <span className="shrink-0 text-sm text-ink-muted">
                  Category
                </span>
              )}
            </li>
          ))}
        </ul>
        {error && open ? (
          <p
            role="status"
            className="absolute top-full right-0 left-0 z-50 mt-2 rounded-card border border-line bg-surface px-4 py-3 text-sm text-danger shadow-elevation md:left-auto md:w-80"
          >
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
