# MASTER PROMPT — MASTER CHEF (Restaurant eCommerce Website)

Build a complete, modern, high-end restaurant ordering website in the working directory.

---

## STACK

Next.js (latest stable, App Router) + TypeScript + React, scaffolded with `npx create-next-app` (npm). **NO Tailwind** — implement the design system as a single well-organized global stylesheet (`app/globals.css`) with CSS variables, responsive rules and animations. Split component styles into CSS modules only if clearly cleaner. Server components by default; add `"use client"` only where interactivity requires it.

---

## BRAND

**MASTER CHEF** — a fast-food / continental restaurant in Peshawar, Pakistan. Positioning: energetic, appetite-driven, but visually premium (think a well-designed modern fast-food brand, not a cluttered template).

- Tagline: **"Hot and Delicious — Full of Flavors"**
- Address: Gulbahar No. 3, Near Jan Bakers, Ishrat Cinema Road, Peshawar
- Phones: `0345-0676764` and `0315-0565515`
- Home delivery + pickup
- Currency: **PKR** — display as `Rs 1,450` (no decimals, thousands separator)
- Midnight deals available **after 10:30 PM**

---

## PAGES (App Router routes)

### `/` — Homepage
- **Large animated hero:** full-viewport, dark gradient overlay, headline with staggered fade/slide-in animation, CTAs ("Order Now" → `/menu`, "View Deals" → `/deals"), scroll-down indicator. Background: if a video file is provided in the working directory, transcode it with ffmpeg (1080p H.264, no audio, faststart) to `public/videos/hero.mp4` and extract a poster frame to `public/images/hero-poster.jpg` — hero = muted/autoplay/loop/playsInline video with poster fallback. If no video is available, fall back to a subtle auto-rotating crossfade slideshow of 2–3 large Unsplash food hero images (that variant is a client component; the video hero is a server component).
- **Category strip:** horizontally scrollable circular/rounded category tiles (Burgers, Shawarma, Paratha Roll, Pizza, Fries, Appetizers, Continental, Platters, Deals) linking to `/menu/[category]`, hover zoom.
- **Deals showcase:** featured deal cards with the included-items list and price badge, linking to `/deals`.
- **Bestsellers grid** (items flagged `featured`).
- **New arrivals** section (items flagged `isNew`).
- **Trending** section (items flagged `trending`).
- **Midnight Deals teaser** banner: shows "Available after 10:30 PM" — a small client component checks the local time and switches the badge to "Available now" when appropriate.
- **Promotional banners:** "Free Delivery on orders over Rs 1,500", "Call to order: 0345-0676764".
- **"Why Master Chef" strip:** 3–4 inline-SVG icon points (Fresh Daily / Fast Delivery / Halal / Family Deals).
- Newsletter / WhatsApp-updates signup strip (UI only).

### `/menu` — Full menu overview
Section-per-category listing with anchor navigation (sticky category tab bar that scroll-spies). Each section shows its items in a responsive grid.

### `/menu/[category]` — Category listing pages
Categories: `burgers`, `shawarma`, `paratha-roll`, `fries`, `appetizers`, `continental`, `pizza`, `platters`.
- Filter pills by subcategory, sort dropdown (Featured, Price low→high, Price high→low, Newest).
- Responsive item grid; cards with hover image-swap and a "Quick add" affordance (quick add uses the item's **first/cheapest variant**).
- Keep filter/sort state in the URL (`?sub=…&sort=…`) so server components can fetch via the service layer and links are shareable.

### `/deals` — Deals page
All numbered deals (Deal 1–11) as large cards showing the included items as a bulleted list, plus a separate **Midnight Deals** section clearly labelled "After 10:30 PM". Deals add to cart as a single line item (no variant selection).

### `/item/[id]` — Item detail
Image gallery (main + thumbnails), name, category badge, description, **variant selector** (e.g. Regular / Large / Family, or Small / Medium / Large — required before add; selecting a variant updates the displayed price), quantity stepper, optional "Special instructions" textarea, Add to Cart (writes to cart context → localStorage, updates nav badge, shows a toast), related items row from the same category.

### `/search` — Search results for `?q=…`

### `/cart` — Cart
Line items with image / name / **variant label** / price, quantity +/− and remove, special-instructions preview, order summary (subtotal, delivery fee, total). Delivery fee rule: **Rs 0 if subtotal ≥ 1500, otherwise Rs 100.** "Proceed to Checkout", empty-cart state with CTA to `/menu`.

### `/checkout` — Checkout
- **Order type toggle:** Delivery / Pickup (pickup hides address fields and zeroes the delivery fee).
- Contact form: name / phone (required, Pakistani format hint `03XX-XXXXXXX`) / email (optional).
- Delivery details: street address, area/locality, city (default "Peshawar"), landmark, optional delivery-time note.
- **Payment: Cash on Delivery (default, selected) and a clearly labelled dummy "Card (demo only)" option** — if card is selected, show dummy card-number/expiry/cvc fields marked *demo only, not processed*.
- Order summary side panel.
- "Place Order" → validates required fields, clears cart, shows confirmation with a fake order number and an estimated delivery time (e.g. 35–45 min), plus a "Call us" `tel:` button.

### `/login` — Login/Signup UI only
Tabbed Sign In / Create Account forms, no real auth, premium styled.

### `/about`, `/contact`, `/privacy` — static pages
`/contact` must include the address, both phone numbers as `tel:` links, a WhatsApp link, opening hours, and a UI-only message form.

---

## SHARED COMPONENTS (`components/`)

- **Navbar (client):** logo, links (Home, Menu, Deals, Contact), search icon expanding into a full-screen search overlay with live suggestions (search navigates to `/search?q=…`), cart icon with live count badge, account icon → `/login`, mobile hamburger with slide-in drawer. **Announcement bar** above nav: rotating messages — "Free delivery over Rs 1,500" / "Call to order: 0345-0676764" / "Midnight deals after 10:30 PM".
- **Footer:** brand blurb, link columns (Menu, Company, Support & Legal), address + phone block, inline SVG social icons, copyright with current year.
- **MenuItemCard**, **DealCard**, **Hero** (video background, slideshow fallback), gallery / **VariantSelector** / QtyStepper (client), scroll-reveal wrapper (IntersectionObserver, fade-up / staggered), toast notifications, **FloatingWhatsAppButton**, **Icons** (inline SVGs only — no icon libraries).
- Navigation via `next/link`; images via `next/image` with `images.remotePatterns` for `images.unsplash.com` and an `onError` fallback to a neutral placeholder so a dead image never renders broken.

---

## CODE STRUCTURE (important — designed for easy backend swap later)

```
app/                        routes + layout.tsx + globals.css
components/                 shared + page-level components (server by default)
lib/data.ts                 BASE_ITEMS + BASE_DEALS + CATEGORIES — typed (see interfaces below).
                            Exports MENU_ITEMS (demo + generated merged; one documented line
                            switches to generated-only) and a subcategoriesFor(category) helper —
                            listing filter pills derive from the ACTIVE menu: only subcategories
                            that actually have items, curated CATEGORIES order first.
lib/generated-items.ts      user listings, regenerated by the import script — never hand-edited
lib/api.ts                  mock async service layer: getItems({category,subcategory,sort,query,limit}),
                            getItemById(id), getFeatured(), getNewArrivals(), getTrending(),
                            getRelated(id), getDeals(), getMidnightDeals() — each returns a Promise
                            resolved from data.ts so it can later be replaced by fetch() calls with
                            ZERO page-level changes. Document it as THE backend-swap seam.
lib/store.tsx               cart state: React Context provider (mounted in root layout, "use client")
                            + localStorage persistence; add/remove/updateQty/count/subtotal/
                            deliveryFee/total. Cart lines are keyed by (itemId + variantLabel) so the
                            same burger in Regular and Large are separate lines.
                            Read localStorage after mount (useEffect) so the SSR'd badge never causes
                            a hydration mismatch.
lib/format.ts               money() helper — formats PKR: money(1450) === "Rs 1,450"
lib/hours.ts                isMidnightDealTime() helper (>= 22:30 local) — used client-side only
scripts/import-menu.mjs     menu import script (see MENU IMPORT PIPELINE below)
incoming/                   menu-template.csv, README.md (column reference), images/ drop folder
README.md                   structure overview + how to swap lib/api.ts mock for real endpoints
```

### Type interfaces

```ts
export interface Variant {
  label: string;   // "Regular" | "Large" | "Family" | "Small" | "Medium" | "10 Pcs" ...
  price: number;   // PKR, integer
}

export interface MenuItem {
  id: string;
  name: string;
  category: "burgers" | "shawarma" | "paratha-roll" | "fries" | "appetizers"
          | "continental" | "pizza" | "platters";
  subcategory: string;          // e.g. "Zinger", "Chicken", "Rolls", "Rice", "Pasta"
  variants: Variant[];          // ALWAYS at least one. Single-price items => [{label:"Regular", price:X}]
  description: string;
  images: [string, string];     // [primary, hover]
  spicy?: boolean;
  featured?: boolean;
  isNew?: boolean;
  trending?: boolean;
}

export interface Deal {
  id: string;
  name: string;                 // "Deal 1", "Midnight Deal 2"
  price: number;                // flat price, no variants
  includes: string[];           // ["2 Arabic Shawarma", "1 Reg. Drink"]
  image: string;
  midnight?: boolean;           // true => only surfaced under "After 10:30 PM"
  featured?: boolean;
}
```

**Price display rule:** if an item has more than one variant, cards show `From Rs <min>`; the detail page shows the price of the currently selected variant.

---

## MENU IMPORT PIPELINE (build this exactly — a follow-up prompt adds items through it)

**User workflow:** copy `incoming/menu-template.csv` → `incoming/menu.csv`, fill one row per item, drop photos into `incoming/images/`, run `npm run import-menu`.

**CSV columns, in order:**
`name, category, subcategory, variants, description, image1, image2, spicy, featured, isNew, trending`

- `category` = one of the eight category slugs above.
- `variants` **required** — pipe-separated `Label:Price` pairs, e.g. `Regular:350|Large:450|Family:700`. A bare number (`350`) is accepted and becomes `Regular:350`.
- `spicy` / `featured` / `isNew` / `trending` = `yes`/`no` (default `no`).
- `image1` / `image2` = filenames in `incoming/images/` (image2 optional, falls back to image1).

**`scripts/import-menu.mjs`** (dependency-free Node, wired as the `import-menu` npm script):
- quote-aware CSV parser;
- validates required fields (name, category, subcategory, variants, image1) and **skips invalid rows with clear per-row errors**;
- validates that every variant price parses to a positive integer;
- auto-slugs ids from names (`-2` suffix on collision);
- optimizes images with macOS-native `sips` (max 1400px, JPEG) into `public/images/menu/<id>-1.jpg` / `<id>-2.jpg`; **if `sips` is unavailable (non-macOS), fall back to copying the file unchanged and print a notice**;
- missing image → neutral placeholder URL + warning;
- regenerates `lib/generated-items.ts` wholesale every run (idempotent, safe to re-run).

---

## SEED DATA — REAL MASTER CHEF MENU

Use this exact data for `BASE_ITEMS` and `BASE_DEALS`. Write plausible one-line appetizing descriptions for each item yourself.

### BURGERS (`category: "burgers"`)
| Name | Variants |
|---|---|
| Big Bun Zinger Burger | Regular:350 |
| Zinger Cheese Burger | Regular:400, Large:450 |
| Zinger & Patty Burger | Regular:550, Large:600 |
| Double Zinger Burger | Regular:650, Large:700 |
| MC Signature Burger | Regular:700 |
| Chicken Burger | Regular:250, Large:300 |
| Chicken Cheese Burger | Regular:300, Large:350 |
| Chicken Patty Burger | Regular:200, Large:250 |
| Chicken Zinger Burger | Regular:300 |

### APPETIZERS (`category: "appetizers"`)
| Name | Variants |
|---|---|
| Chicken Nuggets | 10 Pcs:580, 5 Pcs:300 |
| Chicken Bucket (12 Pcs) | Bucket:1800 |
| Hot Wings (10 Pcs) | 10 Pcs:700 |
| Hot Shots | 5 Pcs:400, 10 Pcs:750 |

### FRIES (`category: "fries"`)
| Name | Variants |
|---|---|
| French Fries | Regular:200, Large:350 |
| Mayo Fries | Regular:250, Large:450 |
| Family Fries | Family:350 |
| Masala Fries | Regular:299 |
| Garlic Mayo Fries | Regular:350 |
| Loaded Cheese Fries | Regular:450, Large:750 |

### SHAWARMA (`category: "shawarma"`)
| Name | Variants |
|---|---|
| Chicken Shawarma | Small:100, Regular:160, Large:200 |
| Zinger Shawarma | Small:200, Regular:250, Large:300 |
| Olive Shawarma | Regular:250 |
| Chicken Cheese Shawarma | Small:200, Regular:250, Large:300 |
| MC Arabic Roll | Regular:550 |
| MC Arabic Platter | Platter:650 |
| MC Twister Roll | Regular:600 |

### PARATHA ROLL (`category: "paratha-roll"`)
| Name | Variants |
|---|---|
| Chicken Paratha Roll | Regular:200, Large:250 |
| Zinger Paratha Roll | Small:200, Regular:250, Large:300 |
| Turkish Chicken Roll | Small:450, Regular:500, Large:550 |
| Chicken Cheese Paratha Roll | Regular:250, Large:300 |

### CONTINENTAL (`category: "continental"`)
| Name | Variants |
|---|---|
| Chicken Chowmein | Small:300, Regular:450, Large:650, Family:1000 |
| Chicken Fried Rice | Regular:350, Large:490 |
| Chicken Chilli Dry with Rice | Regular:450, Large:650 |
| White Sauce Pasta | Regular:500, Large:900 |
| Red Sauce Penne Pasta | Regular:450, Large:800 |
| Lasagne | Regular:500, Large:900 |
| Drum Sticks | 1 Pc:220, 3 Pcs:660, 6 Pcs:1320 |

### PIZZA (`category: "pizza"`)
| Name | Variants |
|---|---|
| MC Special Pizza | Small:600, Medium:900, Large:1500 |
| Calzone Pizza | Small:600, Medium:900 |

### PLATTERS (`category: "platters"`)
| Name | Variants |
|---|---|
| Roasted Platter (5 Wings + 2 Bihari Rolls + Fries) | Platter:950 |

### DEALS (`BASE_DEALS`)
| Deal | Includes | Price |
|---|---|---|
| Deal 1 | 2 Arabic Shawarma, 1 Reg. Drink | 1050 |
| Deal 2 | 3 Zinger Burger, 1 Reg. Fries, 1 Reg. Drink | 1100 |
| Deal 3 | 5 Zinger Burger, 1 Reg. Fries | 1500 |
| Deal 4 | 2 Chicken Patty Burger, 1 Reg. Fries | 650 |
| Deal 5 | 1 Zinger Tower Burger, 1 Reg. Fries | 600 |
| Deal 6 | 1 Double Decker Burger, 1 Reg. Fries | 700 |
| Deal 7 | 5 Special Shawarma, 1 Ltr Drink | 1150 |
| Deal 8 | 3 MC Zinger Shawarma, 1 Ltr Drink | 1050 |
| Deal 9 | 4 MC Zinger Paratha Roll, 1 Reg. Fries | 1400 |
| Deal 10 | 3 Special Chicken Shawarma, 2 Chicken Paratha Roll, 1 Big Bun Zinger Burger, 1 Arabic Shawarma, 1.5 Ltr Drink | 2000 |
| Deal 11 | 4 Crispy Boneless Pcs | 1200 |
| Midnight Deal 1 (`midnight: true`) | 5 Zinger Burger, 1.5 Ltr Drink | 1450 |
| Midnight Deal 2 (`midnight: true`) | 1 Small Pizza, 1 Large Shawarma, 1 Reg. Drink | 699 |

### Images
Use real-looking Unsplash URLs in the form
`https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=900&q=80`
with well-known stable **food** photo IDs, e.g.:
`photo-1568901346375-23c9450c58cd`, `photo-1550547660-d9450f859349`, `photo-1571091718767-18b5b1457add`,
`photo-1594212699903-ec8a3eca50f5`, `photo-1565299624946-b28f40a0ae38`, `photo-1513104890138-7c749659a591`,
`photo-1574071318508-1cdbab80d002`, `photo-1593560708920-61dd98c46a4e`, `photo-1541592106381-b31e9677c0e5`,
`photo-1585238342024-78d387f4a707`, `photo-1603360946369-dc9bb6258143`, `photo-1626700051175-6818013e1d4f`,
`photo-1552914953-93e6b6a4b3f6`, `photo-1600628421055-4d30de868b8f`, `photo-1633945274405-b6c8069047b0`,
`photo-1626082927389-6cd097cdc6ec`, `photo-1529042410759-befb1204b468`, `photo-1546069901-ba9599a7e63c`,
`photo-1604382354936-07c5d9983bd3`, `photo-1621996346565-e3dbc646d9a9`, `photo-1608219992759-8d74ed8d76eb`,
`photo-1585032226651-759b368d7246`, `photo-1562967916-eb82221dfb92`, `photo-1567620905732-2d1ec7ab7445`.
Pick ones that plausibly match the item type; approximate is fine. Hero images: larger `w=1600` variants.

---

## DESIGN SYSTEM

**Palette** (derived from the printed menu — dark, warm, appetite-driven, but restrained):
```
--bg:            #12100f   (near-black charcoal, primary surface)
--bg-alt:        #1b1817   (raised cards)
--cream:         #f6efe3   (light sections / inverted blocks)
--text:          #f6efe3   (on dark)
--text-dark:     #17130f   (on cream)
--muted:         #a89e93
--accent:        #c8102e   (crimson red — CTAs, price badges, category headers)
--accent-warm:   #e8a33d   (gold — logo accents, deal badges, hover)
--hairline:      #2c2724
```
Alternate light sections on cream so the page breathes; keep the hero, navbar and footer dark.

**Typography:** Google Fonts — a bold condensed display face for headings (**Oswald**, uppercase with tight letter-spacing) + **Inter** for body. Loaded via `next/font/google` in the root layout. Prices in a tabular-figure treatment. Uppercase micro-labels with wide letter-spacing for category eyebrows.

**Feel:** generous whitespace, hairline dividers, torn-edge/diagonal section dividers as a nod to the printed menu (pure CSS clip-path, subtle — do not overdo it), price shown in a gold or red badge on cards.

**Animations:** IntersectionObserver-based fade-up reveals on sections/cards; staggered hero text entrance; item card hover = subtle image scale + second-image crossfade; button fill-sweep hover; smooth scrolling; sticky category tab bar with active-state underline slide. Interactive but tasteful.

**Responsive:** mobile-first; grid collapses 4→3→2→1 columns; hamburger nav under ~820px; cart/checkout stack vertically on mobile; category tab bar becomes horizontally scrollable. Sanity-check layout at 375px width. Menu browsing must feel excellent on a phone — most orders will come from mobile.

---

## QUALITY REQUIREMENTS

- All pages share the same nav/footer (root layout) and work end-to-end: browse → item → pick variant → add to cart (badge updates, persists across pages via localStorage) → cart edit → checkout → confirmation.
- Adding the same item in two different variants creates two separate cart lines.
- Delivery-fee logic is correct on both `/cart` and `/checkout`, and is zeroed when Pickup is selected.
- No console errors; `npm run build` must succeed with no type errors.
- **Verify:** start the production server and curl every route (`/`, `/menu`, `/menu/burgers`, `/menu/shawarma`, `/deals`, `/search?q=zinger`, `/item/<id>`, `/cart`, `/checkout`, `/login`, `/about`, `/contact`) expecting 200; then kill the server.
- **Smoke-test the import pipeline:** run `npm run import-menu` against the template's example rows (placeholder-image warnings are expected), confirm `lib/generated-items.ts` is emitted and the items appear on a category page, then reset to a clean state (remove the test CSV, test images, and generated entries).
- Keep code clean and commented where the backend-swap seams are (`lib/api.ts` especially).
