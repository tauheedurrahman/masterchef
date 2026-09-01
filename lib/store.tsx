"use client";

/**
 * Cart state for the whole app.
 *
 * Mounted once in app/layout.tsx so every route shares one cart.
 *
 * Two details worth keeping:
 *  1. Lines are keyed by `${itemId}::${variantLabel}` — the same burger in
 *     Regular and Large are two separate lines with independent quantities.
 *  2. localStorage is only read AFTER mount (useEffect). The server renders an
 *     empty cart, the first client paint matches it, and the stored cart is
 *     applied on the next tick — so the nav badge never causes a hydration
 *     mismatch.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "masterchef.cart.v1";

/** Free delivery at or above this subtotal. */
export const FREE_DELIVERY_THRESHOLD = 1500;
/** Flat delivery fee below the threshold. */
export const DELIVERY_FEE = 100;

export type CartLineKind = "item" | "deal";

export interface CartLine {
  /** `${id}::${variantLabel}` — unique per (item, variant). */
  key: string;
  id: string;
  kind: CartLineKind;
  name: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  image: string;
  notes?: string;
}

export type NewCartLine = Omit<CartLine, "key" | "qty"> & { qty?: number };

interface CartContextValue {
  lines: CartLine[];
  /** Loaded from localStorage yet? Used to avoid flashing an empty cart. */
  hydrated: boolean;
  add: (line: NewCartLine) => void;
  remove: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  /** Toast messages raised by add(); the <Toaster> renders them. */
  toasts: Toast[];
  dismissToast: (id: number) => void;
  notify: (message: string) => void;
}

export interface Toast {
  id: number;
  message: string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function lineKey(id: string, variantLabel: string): string {
  return `${id}::${variantLabel}`;
}

/** Delivery fee for a given subtotal. Single source of truth — /cart and /checkout both call it. */
export function deliveryFeeFor(subtotal: number, pickup = false): number {
  if (pickup) return 0;
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l.key === "string" &&
        typeof l.unitPrice === "number" &&
        typeof l.qty === "number"
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Read persisted cart after mount only — see the note at the top of the file.
  useEffect(() => {
    setLines(readStorage());
    setHydrated(true);
  }, []);

  // Persist on every change, but never before the initial read has happened
  // (otherwise the first render would wipe the stored cart).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full or blocked — the cart still works for this session */
    }
  }, [lines, hydrated]);

  const notify = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const add = useCallback(
    (line: NewCartLine) => {
      const key = lineKey(line.id, line.variantLabel);
      const qty = Math.max(1, line.qty ?? 1);
      setLines((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) {
          return prev.map((l) =>
            l.key === key
              ? { ...l, qty: l.qty + qty, notes: line.notes || l.notes }
              : l
          );
        }
        return [...prev, { ...line, key, qty }];
      });
      notify(`${line.name} added to cart`);
    },
    [notify]
  );

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty } : l))
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let s = 0;
    for (const l of lines) {
      c += l.qty;
      s += l.qty * l.unitPrice;
    }
    return { count: c, subtotal: s };
  }, [lines]);

  const deliveryFee = deliveryFeeFor(subtotal);

  const value: CartContextValue = {
    lines,
    hydrated,
    add,
    remove,
    updateQty,
    clear,
    count,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    toasts,
    dismissToast,
    notify,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
