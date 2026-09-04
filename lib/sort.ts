/**
 * Sort options — shared by the server and the browser.
 *
 * These live here rather than in lib/api.ts because <SortSelect> is a client
 * component and needs the list to render its dropdown. lib/api.ts throws on
 * sight of `window` (it holds the admin key), so importing the constant from
 * there dragged the whole server-only module into the client bundle and blew
 * up the category page during hydration.
 *
 * Nothing in this file may import lib/api.ts, or the cycle comes straight back.
 * lib/api.ts re-exports both of these, so every existing import still works.
 */

export type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];
