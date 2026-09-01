/**
 * ============================================================================
 *  THE BACKEND-SWAP SEAM
 * ============================================================================
 *
 * Every page and component in this app reads menu data through THIS module and
 * nothing else. It is deliberately async: each function returns a Promise, even
 * though today it resolves synchronously out of lib/data.ts.
 *
 * When a real backend lands, replace the *bodies* below with fetch() calls —
 * e.g.
 *
 *     export async function getItems(opts: ItemQuery = {}): Promise<MenuItem[]> {
 *       const qs = new URLSearchParams(clean(opts) as Record<string, string>);
 *       const res = await fetch(`${process.env.API_URL}/items?${qs}`, {
 *         next: { revalidate: 60 },
 *       });
 *       if (!res.ok) throw new Error(`getItems failed: ${res.status}`);
 *       return res.json();
 *     }
 *
 * Keep the signatures and the returned shapes identical and NO page, route or
 * component needs to change. That is the whole point of this file.
 *
 * (Filtering/sorting is done here rather than in the pages precisely so that a
 * real API can take that work over without any caller noticing.)
 */

import {
  DEALS,
  MENU_ITEMS,
  type CategorySlug,
  type Deal,
  type MenuItem,
} from "./data";
import { minPrice } from "./format";

export type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

export interface ItemQuery {
  category?: CategorySlug | string;
  subcategory?: string;
  sort?: SortKey | string;
  query?: string;
  limit?: number;
}

/** Simulates network latency without actually being slow. */
function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

function matchesQuery(item: MenuItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    item.name,
    item.description,
    item.subcategory,
    item.category,
    ...item.variants.map((v) => v.label),
  ]
    .join(" ")
    .toLowerCase();
  // Every whitespace-separated token must appear somewhere.
  return needle.split(/\s+/).every((token) => haystack.includes(token));
}

function sortItems(items: MenuItem[], sort: string | undefined): MenuItem[] {
  const list = [...items];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => minPrice(a.variants) - minPrice(b.variants));
    case "price-desc":
      return list.sort((a, b) => minPrice(b.variants) - minPrice(a.variants));
    case "newest":
      return list.sort(
        (a, b) => Number(!!b.isNew) - Number(!!a.isNew)
      );
    case "featured":
    default:
      return list.sort(
        (a, b) =>
          Number(!!b.featured) - Number(!!a.featured) ||
          Number(!!b.trending) - Number(!!a.trending)
      );
  }
}

/* ------------------------------------------------------------------ *
 * Items
 * ------------------------------------------------------------------ */

/** Filtered + sorted menu items. All listing pages funnel through here. */
export async function getItems(opts: ItemQuery = {}): Promise<MenuItem[]> {
  const { category, subcategory, sort, query, limit } = opts;

  let items = MENU_ITEMS;
  if (category) items = items.filter((i) => i.category === category);
  if (subcategory) items = items.filter((i) => i.subcategory === subcategory);
  if (query) items = items.filter((i) => matchesQuery(i, query));

  items = sortItems(items, sort);
  if (limit && limit > 0) items = items.slice(0, limit);

  return resolve(items);
}

export async function getItemById(id: string): Promise<MenuItem | null> {
  return resolve(MENU_ITEMS.find((i) => i.id === id) ?? null);
}

export async function getFeatured(limit = 8): Promise<MenuItem[]> {
  return resolve(MENU_ITEMS.filter((i) => i.featured).slice(0, limit));
}

export async function getNewArrivals(limit = 6): Promise<MenuItem[]> {
  return resolve(MENU_ITEMS.filter((i) => i.isNew).slice(0, limit));
}

export async function getTrending(limit = 6): Promise<MenuItem[]> {
  return resolve(MENU_ITEMS.filter((i) => i.trending).slice(0, limit));
}

/** Other items in the same category, excluding the item itself. */
export async function getRelated(id: string, limit = 4): Promise<MenuItem[]> {
  const item = MENU_ITEMS.find((i) => i.id === id);
  if (!item) return resolve([]);
  const related = MENU_ITEMS.filter(
    (i) => i.category === item.category && i.id !== item.id
  ).slice(0, limit);
  return resolve(related);
}

/** Every category slug that currently has at least one item. */
export async function getCategoriesInUse(): Promise<string[]> {
  return resolve([...new Set(MENU_ITEMS.map((i) => i.category))]);
}

/* ------------------------------------------------------------------ *
 * Deals
 * ------------------------------------------------------------------ */

/** Regular (non-midnight) deals. */
export async function getDeals(): Promise<Deal[]> {
  return resolve(DEALS.filter((d) => !d.midnight));
}

/** Deals only offered after 10:30 PM. */
export async function getMidnightDeals(): Promise<Deal[]> {
  return resolve(DEALS.filter((d) => d.midnight));
}

export async function getDealById(id: string): Promise<Deal | null> {
  return resolve(DEALS.find((d) => d.id === id) ?? null);
}
