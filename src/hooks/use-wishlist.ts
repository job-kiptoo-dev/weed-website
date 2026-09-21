"use client";

/**
 * Phase 1 client-only wishlist (same store pattern as `use-cart`). Stores
 * product ids only, persisted to localStorage.
 */
import { useSyncExternalStore } from "react";
import { z } from "zod";

export const WISHLIST_STORAGE_KEY = "haven-wishlist-v1";

const wishlistSchema = z.array(z.string().min(1));

const EMPTY: readonly string[] = Object.freeze([]);

type Listener = () => void;

/** `null` until the first client read; the store hydrates lazily from storage. */
let ids: readonly string[] | null = null;
const listeners = new Set<Listener>();

function readFromStorage(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
  } catch (error) {
    console.warn(
      "Wishlist: localStorage is unavailable, starting empty.",
      error,
    );
    return EMPTY;
  }
  if (raw === null) return EMPTY;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(
      "Wishlist: stored wishlist is not valid JSON, starting empty.",
      error,
    );
    return EMPTY;
  }

  const result = wishlistSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      "Wishlist: stored wishlist failed validation, starting empty.",
      result.error.issues,
    );
    return EMPTY;
  }
  return result.data;
}

function writeToStorage(next: readonly string[]): void {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn(
      "Wishlist: could not persist wishlist to localStorage.",
      error,
    );
  }
}

function getSnapshot(): readonly string[] {
  if (ids === null) ids = readFromStorage();
  return ids;
}

function getServerSnapshot(): readonly string[] {
  return EMPTY;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function toggleId(id: string): void {
  const current = getSnapshot();
  const next = current.includes(id)
    ? current.filter((existing) => existing !== id)
    : [...current, id];
  ids = next;
  writeToStorage(next);
  listeners.forEach((listener) => listener());
}

/** Test-only: forget the in-memory state so the next read hits storage. */
export function __resetWishlistStore(): void {
  ids = null;
}

export interface UseWishlistResult {
  ids: readonly string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
}

export function useWishlist(): UseWishlistResult {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return {
    ids: current,
    has: (id) => current.includes(id),
    toggle: toggleId,
  };
}
