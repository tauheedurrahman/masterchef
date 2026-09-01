# MASTER CHEF — restaurant ordering website

> **Hot and Delicious — Full of Flavors**
> Gulbahar No. 3, Near Jan Bakers, Ishrat Cinema Road, Peshawar
> 0345-0676764 · 0315-0565515

A complete storefront for a Peshawar fast-food and continental restaurant:
browse the menu, pick a size, add to cart, check out for delivery or pickup.
Built with **Next.js (App Router) + TypeScript**, server components by default,
and a single hand-written design system in `app/globals.css` — no CSS framework,
no icon library, no UI kit.

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script                 | What it does |
|------------------------|--------------|
| `npm run dev`          | Dev server |
| `npm run build`        | Production build (type-checked) |
| `npm run start`        | Serve the production build |
| `npm run import-menu`  | Import items from `incoming/menu.csv` — see [incoming/README.md](incoming/README.md) |

---

## Project structure

```
app/
  layout.tsx              root layout — fonts, CartProvider, navbar, footer, toaster
  globals.css             the entire design system (tokens → components → responsive)
  page.tsx                homepage
  menu/page.tsx           full menu, section per category, sticky scroll-spy tab bar
  menu/[category]/        category listing — subcategory pills + sort, state lives in the URL
  deals/page.tsx          Deals 1–11 + the "After 10:30 PM" midnight section
  item/[id]/page.tsx      gallery, variant selector, qty, notes, related items
  search/page.tsx         results for ?q=…
  cart/  checkout/        cart editing, order type, contact/address, payment, confirmation
  login/  about/  contact/  privacy/

components/               server components by default; "use client" only where needed
  Navbar · Footer · Hero (+HeroSlideshow) · MenuItemCard · DealCard · CategoryStrip
  ItemGallery · ItemPurchasePanel · VariantSelector · QtyStepper · QuickAddButton
  CartView · CheckoutView · AuthTabs · ContactForm · NewsletterForm
  Reveal (IntersectionObserver) · Toaster · MidnightBadge · SafeImage
  FloatingWhatsAppButton · Icons (inline SVG only)

lib/
  data.ts                 BASE_ITEMS + BASE_DEALS + CATEGORIES, types, MENU_ITEMS, subcategoriesFor()
  generated-items.ts      written by the import script — never hand-edit
  api.ts                  ★ the mock service layer — THE BACKEND-SWAP SEAM
  store.tsx               cart context + localStorage persistence
  format.ts               money() → "Rs 1,450"
  hours.ts                isMidnightDealTime() — 22:30 onward, client-side only
  site.ts                 brand, address, phone numbers, hours

scripts/import-menu.mjs   dependency-free CSV → menu importer
incoming/                 menu-template.csv, README.md (column reference), images/ drop folder
```

---

## Swapping the mock data for a real backend

**`lib/api.ts` is the only place that touches menu data.** Every page and
component calls it; nothing imports `lib/data.ts` for page content. Each
function is already `async` and returns a Promise, so the page code is written
as if the data were remote.

To go live, replace the function bodies — nothing else:

```ts
// before (mock)
export async function getItems(opts: ItemQuery = {}): Promise<MenuItem[]> {
  let items = MENU_ITEMS;
  if (opts.category) items = items.filter((i) => i.category === opts.category);
  /* …filter/sort locally… */
  return Promise.resolve(items);
}

// after (real API) — same signature, same return shape
export async function getItems(opts: ItemQuery = {}): Promise<MenuItem[]> {
  const qs = new URLSearchParams(
    Object.entries(opts).filter(([, v]) => v != null) as [string, string][]
  );
  const res = await fetch(`${process.env.API_URL}/items?${qs}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`getItems failed: ${res.status}`);
  return res.json();
}
```

The seam covers:

| Function | Used by |
|---|---|
| `getItems({category, subcategory, sort, query, limit})` | `/menu`, `/menu/[category]`, `/search`, navbar search index |
| `getItemById(id)` | `/item/[id]` |
| `getFeatured()` / `getNewArrivals()` / `getTrending()` | homepage sections |
| `getRelated(id)` | "You might also like" |
| `getDeals()` / `getMidnightDeals()` / `getDealById(id)` | `/deals`, homepage |

Filtering and sorting happen **inside** `lib/api.ts` rather than in the pages,
precisely so a real API can take that work over without any caller noticing.

The cart (`lib/store.tsx`) is deliberately independent: it stores denormalised
line snapshots, so it keeps working whatever the menu source becomes. Wiring
"Place Order" to a real endpoint means one `fetch` in
`components/CheckoutView.tsx` where `setPlaced(...)` is called today.

---

## Adding menu items

Full instructions: **[incoming/README.md](incoming/README.md)**.

```bash
cp incoming/menu-template.csv incoming/menu.csv   # fill one row per item
#   drop the photos into incoming/images/
npm run import-menu
```

The script parses the CSV (quote-aware), validates every row, skips bad rows
with a per-row reason, slugs unique ids, optimises photos into
`public/images/menu/` (macOS `sips`; elsewhere it copies and says so), falls
back to a placeholder for missing images, and regenerates
`lib/generated-items.ts` from scratch — safe to re-run any time.

Those items are merged with the demo seed in `lib/data.ts`:

```ts
export const MENU_ITEMS: MenuItem[] = [...BASE_ITEMS, ...GENERATED_ITEMS];
// to ship only your own listings:
// export const MENU_ITEMS: MenuItem[] = [...GENERATED_ITEMS];
```

Subcategory filter pills are derived from the **active** menu
(`subcategoriesFor()`), so new subcategories appear automatically.

---

## Behaviour worth knowing

**Prices** — integer PKR, formatted by `money()` as `Rs 1,450`. Cards show
`From Rs <min>` when an item has more than one variant; the detail page shows
the price of the selected variant.

**Cart** — lines are keyed by `itemId + variantLabel`, so the same burger in
Regular and Large are two independent lines. State persists to `localStorage`
and is read back **after mount**, so the SSR'd nav badge never causes a
hydration mismatch. Deals are added as a single flat line with no variant.

**Delivery fee** — one rule, one function (`deliveryFeeFor()` in `lib/store.tsx`),
used by both `/cart` and `/checkout`: **Rs 0 at or above Rs 1,500, otherwise
Rs 100**, and always Rs 0 when Pickup is selected.

**Midnight deals** — `isMidnightDealTime()` reads the visitor's clock and is
only ever called from `useEffect`. The badge renders "Available after 10:30 PM"
on the server and flips to "Available now" after 22:30 local.

**Checkout** — Cash on Delivery is the default; the Card option is clearly
labelled *demo only* and its fields are never validated, stored or transmitted.
Placing an order clears the cart and shows a fake order number, an ETA and a
`tel:` call button. Nothing leaves the browser.

**Hero** — if `public/videos/hero.mp4` exists, the hero renders a muted
autoplay/loop/playsInline video (server component) with
`public/images/hero-poster.jpg` as the poster. Otherwise it falls back to a
client-side crossfade slideshow of three large stills. No code change is needed
to switch — drop the files in:

```bash
ffmpeg -i source.mov -an -vf "scale=-2:1080" -c:v libx264 -crf 23 \
       -movflags +faststart public/videos/hero.mp4
ffmpeg -i public/videos/hero.mp4 -ss 2 -frames:v 1 public/images/hero-poster.jpg
```

**Images** — `next/image` with `images.remotePatterns` allowing
`images.unsplash.com`. `components/SafeImage.tsx` swaps in
`public/images/placeholder.svg` on any load error, so a dead URL never renders
as a broken image.

---

## Design system

Everything lives in `app/globals.css`, organised in sixteen numbered sections
from tokens to responsive rules.

```
--bg #12100f   --bg-alt #1b1817   --cream #f6efe3   --muted #a89e93
--accent #c8102e (crimson)        --accent-warm #e8a33d (gold)
--hairline #2c2724
```

Type is **Oswald** (condensed display, uppercase, tight tracking) over
**Inter** (body), loaded with `next/font/google`. Prices use tabular figures.
Dark surfaces alternate with cream sections, joined by subtle `clip-path`
diagonal dividers as a nod to the printed menu.

Motion: staggered hero entrance, IntersectionObserver fade-up reveals
(`<Reveal>` / `<Reveal group>`), card hover image crossfade, button fill-sweep,
sliding tab underline. All of it collapses under
`prefers-reduced-motion: reduce`.

Layout is mobile-first: the grid steps 4 → 3 → 2 → 1, the nav becomes a
hamburger drawer under 820px, cart and checkout stack, and the category tab bar
scrolls horizontally. Checked down to 375px.

---

## Notes

This is a demonstration storefront. No payments are processed, no orders reach
a kitchen, and no account is ever created — the login page, contact form and
newsletter strip are UI only.
