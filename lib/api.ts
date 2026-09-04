/**
 * ============================================================================
 *  THE BACKEND-SWAP SEAM  —  now backed by InsForge
 * ============================================================================
 *
 * Every page and component reads menu data through THIS module and nothing
 * else. The signatures below are unchanged from the mock era; only the bodies
 * moved from lib/data.ts to InsForge Postgres.
 *
 * Reads go through the ADMIN client on purpose. RLS grants the anon role only
 * `available = true` rows, but the storefront has to render sold-out items
 * (greyed out, "Sold Out" badge) rather than hide them. This module is only
 * ever imported from server components and route handlers, so the admin key
 * never reaches the browser.
 *
 * Filtering and sorting still happen here so callers stay identical.
 */

import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { insforgeAdmin } from "./insforge";
import { type CategorySlug, type Deal, type MenuItem } from "./data";
import { minPrice } from "./format";

// Hard stop if this ever gets pulled into a client bundle — the admin key
// below must never ship to a browser.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/api.ts is server-only. Fetch through a server component or route handler."
  );
}

/**
 * Re-exported from lib/sort so this module's public API is unchanged.
 *
 * The definitions moved out because <SortSelect> is a client component: it
 * needs SORT_OPTIONS, and importing it from here pulled this server-only file
 * into the browser bundle, where the guard above throws on module evaluation.
 */
export { SORT_OPTIONS, type SortKey } from "./sort";
import { type SortKey } from "./sort";

export interface ItemQuery {
  category?: CategorySlug | string;
  subcategory?: string;
  sort?: SortKey | string;
  query?: string;
  limit?: number;
}

/**
 * A menu item as it comes back from the database. Structurally a MenuItem plus
 * the two columns the storefront and admin need. Anywhere a MenuItem was
 * accepted before, this still fits.
 */
export interface MenuItemRow extends MenuItem {
  available: boolean;
  sortOrder: number;
}

export interface DealRow extends Deal {
  available: boolean;
}

/* ------------------------------------------------------------------ *
 * Row mapping — snake_case columns to the camelCase shape pages expect
 * ------------------------------------------------------------------ */

type RawItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  variants: unknown;
  description: string | null;
  images: unknown;
  spicy: boolean | null;
  featured: boolean | null;
  is_new: boolean | null;
  trending: boolean | null;
  available: boolean | null;
  sort_order: number | null;
};

type RawDeal = {
  id: string;
  name: string;
  price: number;
  includes: unknown;
  image: string | null;
  midnight: boolean | null;
  featured: boolean | null;
  available: boolean | null;
};

const PLACEHOLDER = "/images/placeholder.svg";

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toItem(row: RawItem): MenuItemRow {
  const images = asArray<string>(row.images);
  return {
    id: row.id,
    name: row.name,
    category: row.category as CategorySlug,
    subcategory: row.subcategory,
    variants: asArray<{ label: string; price: number }>(row.variants),
    description: row.description ?? "",
    images: [images[0] ?? PLACEHOLDER, images[1] ?? images[0] ?? PLACEHOLDER],
    spicy: row.spicy ?? false,
    featured: row.featured ?? false,
    isNew: row.is_new ?? false,
    trending: row.trending ?? false,
    available: row.available ?? true,
    sortOrder: row.sort_order ?? 0,
  };
}

function toDeal(row: RawDeal): DealRow {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    includes: asArray<string>(row.includes),
    image: row.image ?? PLACEHOLDER,
    midnight: row.midnight ?? false,
    featured: row.featured ?? false,
    available: row.available ?? true,
  };
}

/**
 * Opts the calling render out of the static prerender.
 *
 * The menu is edited from the admin dashboard, so a page baked at build time
 * is wrong the moment someone adds an item: /menu and the homepage kept
 * serving the build-time menu while /menu/[category] (already dynamic) showed
 * the new item. Marking the read as request-time is what makes every page
 * that displays menu data re-query on each request.
 *
 * generateStaticParams is the one caller that legitimately runs with no
 * request behind it, and Next throws for connection() there. That is the only
 * error swallowed below — unstable_rethrow first re-throws Next's own control
 * flow (the prerender bail-out, notFound, redirect), which must never be
 * caught or this whole mechanism silently stops working.
 */
async function requestTime(): Promise<void> {
  try {
    await connection();
  } catch (err) {
    unstable_rethrow(err);
    // Build-time id enumeration: a plain read is correct and sufficient.
  }
}

/** Every read funnels through here so a backend error is loud but not fatal. */
async function fetchItems(): Promise<MenuItemRow[]> {
  await requestTime();
  const { data, error } = await insforgeAdmin()
    .database.from("menu_items")
    .select()
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[api] menu_items read failed:", error.message ?? error);
    return [];
  }
  return (data as RawItem[] | null)?.map(toItem) ?? [];
}

async function fetchDeals(): Promise<DealRow[]> {
  await requestTime();
  const { data, error } = await insforgeAdmin()
    .database.from("deals")
    .select()
    .order("id", { ascending: true });

  if (error) {
    console.error("[api] deals read failed:", error.message ?? error);
    return [];
  }
  return (data as RawDeal[] | null)?.map(toDeal) ?? [];
}

/* ------------------------------------------------------------------ *
 * Filtering / sorting (unchanged behaviour)
 * ------------------------------------------------------------------ */

function matchesQuery(item: MenuItemRow, q: string): boolean {
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
  return needle.split(/\s+/).every((token) => haystack.includes(token));
}

function sortItems(items: MenuItemRow[], sort: string | undefined): MenuItemRow[] {
  const list = [...items];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => minPrice(a.variants) - minPrice(b.variants));
    case "price-desc":
      return list.sort((a, b) => minPrice(b.variants) - minPrice(a.variants));
    case "newest":
      return list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
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
export async function getItems(opts: ItemQuery = {}): Promise<MenuItemRow[]> {
  const { category, subcategory, sort, query, limit } = opts;

  let items = await fetchItems();
  if (category) items = items.filter((i) => i.category === category);
  if (subcategory) items = items.filter((i) => i.subcategory === subcategory);
  if (query) items = items.filter((i) => matchesQuery(i, query));

  items = sortItems(items, sort);
  if (limit && limit > 0) items = items.slice(0, limit);

  return items;
}

export async function getItemById(id: string): Promise<MenuItemRow | null> {
  await requestTime();
  const { data, error } = await insforgeAdmin()
    .database.from("menu_items")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[api] getItemById failed:", error.message ?? error);
    return null;
  }
  return data ? toItem(data as RawItem) : null;
}

export async function getFeatured(limit = 8): Promise<MenuItemRow[]> {
  const items = await fetchItems();
  return items.filter((i) => i.featured).slice(0, limit);
}

export async function getNewArrivals(limit = 6): Promise<MenuItemRow[]> {
  const items = await fetchItems();
  return items.filter((i) => i.isNew).slice(0, limit);
}

export async function getTrending(limit = 6): Promise<MenuItemRow[]> {
  const items = await fetchItems();
  return items.filter((i) => i.trending).slice(0, limit);
}

/** Other items in the same category, excluding the item itself. */
export async function getRelated(id: string, limit = 4): Promise<MenuItemRow[]> {
  const items = await fetchItems();
  const item = items.find((i) => i.id === id);
  if (!item) return [];
  return items
    .filter((i) => i.category === item.category && i.id !== item.id)
    .slice(0, limit);
}

/** Every category slug that currently has at least one item. */
export async function getCategoriesInUse(): Promise<string[]> {
  const items = await fetchItems();
  return [...new Set(items.map((i) => i.category))];
}

/* ------------------------------------------------------------------ *
 * Deals
 * ------------------------------------------------------------------ */

/** Regular (non-midnight) deals. */
export async function getDeals(): Promise<DealRow[]> {
  const deals = await fetchDeals();
  return deals.filter((d) => !d.midnight);
}

/** Deals only offered after 10:30 PM. */
export async function getMidnightDeals(): Promise<DealRow[]> {
  const deals = await fetchDeals();
  return deals.filter((d) => d.midnight);
}

export async function getDealById(id: string): Promise<DealRow | null> {
  const deals = await fetchDeals();
  return deals.find((d) => d.id === id) ?? null;
}
