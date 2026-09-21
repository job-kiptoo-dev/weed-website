"use client";

/**
 * Phase 1 client-only cart. Replaced by cartService + server actions in
 * Phase 5. Stores ids and quantities only; prices are resolved from product
 * data.
 */
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { z } from "zod";
import { cartReducer } from "@/lib/cart";
import type { CartAction, CartLine, CartState } from "@/types/cart";

export const CART_STORAGE_KEY = "haven-cart-v1";

const cartLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable(),
  quantity: z.number().int().positive(),
});

const cartStateSchema = z.object({ lines: z.array(cartLineSchema) });

const EMPTY: CartState = Object.freeze({ lines: [] });

type Listener = () => void;

/** `null` until the first client read; the store hydrates lazily from storage. */
let state: CartState | null = null;
const listeners = new Set<Listener>();

function readFromStorage(): CartState {
  if (typeof window === "undefined") return EMPTY;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CART_STORAGE_KEY);
  } catch (error) {
    console.warn("Cart: localStorage is unavailable, starting empty.", error);
    return EMPTY;
  }
  if (raw === null) return EMPTY;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn("Cart: stored cart is not valid JSON, starting empty.", error);
    return EMPTY;
  }

  const result = cartStateSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      "Cart: stored cart failed validation, starting empty.",
      result.error.issues,
    );
    return EMPTY;
  }
  return result.data;
}

function writeToStorage(next: CartState): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Cart: could not persist cart to localStorage.", error);
  }
}

function getSnapshot(): CartState {
  if (state === null) state = readFromStorage();
  return state;
}

function getServerSnapshot(): CartState {
  return EMPTY;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function dispatch(action: CartAction): void {
  const next = cartReducer(getSnapshot(), action);
  if (next === state) return;
  state = next;
  writeToStorage(next);
  listeners.forEach((listener) => listener());
}

/** Test-only: forget the in-memory state so the next read hits storage. */
export function __resetCartStore(): void {
  state = null;
}

interface CartContextValue {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const value: CartContextValue = {
    isDrawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  };

  return <CartContext value={value}>{children}</CartContext>;
}

export interface UseCartResult extends CartContextValue {
  lines: CartLine[];
  itemCount: number;
  addLine: (
    productId: string,
    variantId: string | null,
    quantity?: number,
  ) => void;
  setQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => void;
  removeLine: (productId: string, variantId: string | null) => void;
  clear: () => void;
}

export function useCart(): UseCartResult {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error(
      "useCart must be used inside <CartProvider>. Wrap your tree (for example in the storefront Providers component) before calling it.",
    );
  }

  const { lines } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    lines,
    itemCount,
    addLine: (productId, variantId, quantity = 1) =>
      dispatch({ type: "add", productId, variantId, quantity }),
    setQuantity: (productId, variantId, quantity) =>
      dispatch({ type: "setQuantity", productId, variantId, quantity }),
    removeLine: (productId, variantId) =>
      dispatch({ type: "remove", productId, variantId }),
    clear: () => dispatch({ type: "clear" }),
    isDrawerOpen: context.isDrawerOpen,
    openDrawer: context.openDrawer,
    closeDrawer: context.closeDrawer,
  };
}
