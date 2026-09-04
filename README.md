<div align="center">

# 🍔 MASTER CHEF

### Hot and Delicious — Full of Flavors

**A production restaurant ordering platform for a Peshawar fast-food & continental kitchen —
storefront, customer accounts, loyalty, promo codes, and a full admin dashboard.**

<br/>

### 🔗 [**View the Live Site →**](https://masterchef.insforge.site/)

<br/>

[![Live](https://img.shields.io/badge/Live-masterchef.insforge.site-c8102e?style=for-the-badge)](https://masterchef.insforge.site/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![InsForge](https://img.shields.io/badge/InsForge-Postgres-e8a33d?style=for-the-badge)](https://insforge.dev/)

<br/>

📍 Gulbahar No. 3, Near Jan Bakers, Ishrat Cinema Road, Peshawar
📞 0345-0676764 · 0315-0565515

</div>

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Database schema](#database-schema)
- [Admin dashboard](#admin-dashboard)
- [Business rules](#business-rules)
- [Managing the menu](#managing-the-menu)
- [Design system](#design-system)
- [Deployment](#deployment)
- [Scripts reference](#scripts-reference)

---

## Overview

**Master Chef** is a complete, end-to-end ordering website for a real restaurant. A visitor can
browse the menu by category, pick a size, build a cart, apply a promo code and check out for
delivery or pickup. A returning customer can sign in with their phone number to track orders,
save addresses, collect loyalty points and unlock members-only offers. Behind `/admin`, the
restaurant runs the whole operation: live orders, menu and category management, deals, promo codes
and customer records.

Every price, item, deal and order lives in **Postgres**. Nothing on the storefront is hardcoded,
and orders are **priced server-side against the database** — never against numbers sent by the
browser.

> **Built with the Next.js App Router** — server components by default, `"use client"` only where
> interaction genuinely requires it, and a single hand-written design system in
> `app/globals.css`. No CSS framework, no icon library, no UI kit.

---

## Features

### 🛒 Storefront

| | |
|---|---|
| **Menu browsing** | Eight categories, section-per-category page with a sticky scroll-spy tab bar |
| **Category pages** | Subcategory filter pills + sort control, with all state held in the URL (shareable, back-button safe) |
| **Item detail** | Image gallery, variant selector, quantity stepper, special-instruction notes, related items |
| **Search** | Search across the live menu at `/search?q=…` |
| **Deals** | Deals 1–11 plus a time-gated **"After 10:30 PM"** midnight section |
| **Cart** | Variant-aware lines, `localStorage` persistence, hydration-safe badge, live delivery-fee preview |
| **Checkout** | Delivery or pickup, saved-address picker, promo code validation, Cash on Delivery |
| **WhatsApp** | Floating one-tap order button pre-filled with a greeting |

### 👤 Customer accounts

- **Phone-number sign-in** — `03XX-XXXXXXX` is the identifier; no email required
- **Order history** with live status pills (new → confirmed → preparing → out for delivery → delivered)
- **Saved addresses** — up to five, with a default, label and landmark
- **Loyalty points** — one point per Rs 100 spent, credited when an order is placed
- **Members-only offers** surfaced in the profile and validated at checkout
- **Server-side cart recovery** — a signed-in customer's cart follows them across devices

### 🔐 Admin dashboard

- **Dashboard** — today's orders, revenue, average order value, status breakdown, top-selling items
- **Orders** — live queue with a new-order badge, status transitions, and one-tap call-the-customer
- **Menu** — create, edit, reorder and toggle availability for items *and* categories, with image upload
- **Deals** — full CRUD, including midnight and featured flags
- **Customers** — searchable directory with lifetime orders, spend and loyalty balance
- **Offers** — promo codes with percentage/fixed discounts, minimum order, usage caps and expiry
- **Settings** — change the admin password

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server components, route handlers, edge middleware |
| **UI** | React 19 + TypeScript 5 | Strict types end to end |
| **Backend** | [InsForge](https://insforge.dev) | Postgres, auth, storage and RLS from one platform |
| **Database** | PostgreSQL with Row Level Security | Customers can only ever read their own rows |
| **Storage** | InsForge Storage (`menu-images`) | Menu photography, served via CDN |
| **Auth** | InsForge Auth (customers) + signed HMAC cookie (admin) | Two separate, independent identity systems |
| **Styling** | Hand-written CSS in `app/globals.css` | One design system, zero framework weight |
| **Fonts** | Oswald + Inter via `next/font/google` | Self-hosted, no layout shift |
| **Automation** | n8n webhook | Orders forwarded to the kitchen after the response flushes |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            BROWSER                                  │
│   Server-rendered pages  ·  Cart context (localStorage)             │
│   httpOnly auth cookies — no token ever reaches JavaScript          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                     middleware.ts  (edge gate)                      │
│   /admin/*  /api/admin/*  → signed admin cookie, else 401/redirect  │
│   /profile/*              → customer session cookie, else /login    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼─────────┐
│    lib/api.ts  │  │  /api/auth/*    │  │  /api/admin/*    │
│  menu reads    │  │  customer scope │  │  admin scope     │
│  (admin key)   │  │  (RLS applied)  │  │  (admin key)     │
└───────┬────────┘  └────────┬────────┘  └────────┬─────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    InsForge — Postgres + Storage                    │
│  menu_items · categories · deals · customers · customer_addresses   │
│  orders · saved_carts · offers · used_offers · admin_users          │
└─────────────────────────────────────────────────────────────────────┘
```

### Four clients, one rule: the right scope for the caller

`lib/insforge.ts` exposes exactly four entry points, and picking the wrong one is the difference
between a safe query and a data leak:

| Client | Runs in | Scope |
|---|---|---|
| `insforgeBrowser()` | Browser | Reads the session cookie. `auth` is deliberately reduced — **sign-in cannot happen here** |
| `insforgeServer(cookies)` | Server components, route handlers | Runs **as the signed-in customer**, with RLS applied |
| `authActions(cookies)` | Route handlers only | `signUp` / `signIn` / `signOut`; writes httpOnly cookies and strips tokens from the response |
| `insforgeAdmin()` | Server only | Project API key, **bypasses RLS** — never importable from a client component |

`lib/api.ts` carries a hard runtime guard that throws if it is ever evaluated in a browser, so the
admin key cannot be pulled into a client bundle by an accidental import.

### The `lib/api.ts` seam

Every page and component reads menu data through `lib/api.ts` and nothing else. It began life as a
mock layer and was swapped to InsForge Postgres **without a single caller changing** — the
signatures, filtering and sorting all still live there by design.

```ts
getItems({ category, subcategory, sort, query, limit })   // /menu, /menu/[category], /search
getItemById(id)                                           // /item/[id]
getFeatured() · getNewArrivals() · getTrending()          // homepage sections
getRelated(id)                                            // "You might also like"
getCategories() · getCategoryBySlug(slug)                 // nav, category pages, homepage strip
getDeals() · getMidnightDeals() · getDealById(id)         // /deals, homepage
```

Reads use the admin client on purpose: RLS grants anonymous callers only `available = true` rows,
but the storefront needs to render sold-out items greyed out with a **Sold Out** badge rather than
hide them.

---

## Getting started

### Prerequisites

- **Node.js 20+** (the seed script relies on `--env-file`)
- An **InsForge** project — [insforge.dev](https://insforge.dev)

### Installation

```bash
# 1 — clone and install
git clone <your-repo-url> master-chef
cd master-chef
npm install

# 2 — configure: create .env.local with your InsForge keys (see the table below)

# 3 — create the schema
#     apply schema.sql, then everything in migrations/ in filename order

# 4 — seed the menu, upload photos, create the admin user
npm run seed

# 5 — run
npm run dev                    # → http://localhost:3000
```

The storefront is at `/`, the customer area at `/profile`, and the dashboard at `/admin` — sign in
as `admin` with whatever you set as `ADMIN_DEFAULT_PASSWORD`, then change it under **Settings**.

---

## Environment variables

Create `.env.local` in the project root. It is git-ignored, and **no key is ever hardcoded**.

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | Public | InsForge API base URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Public | Anonymous key — RLS-constrained |
| `INSFORGE_API_KEY` | **Server only** | Admin key. Bypasses RLS — must never be `NEXT_PUBLIC_` |
| `ADMIN_SESSION_SECRET` | **Server only** | HMAC secret signing the admin session cookie |
| `ADMIN_DEFAULT_PASSWORD` | **Server only** | Password for the `admin` user created by `npm run seed` |
| `NEXT_PUBLIC_WEBHOOK_URL` | Public | n8n endpoint that receives new orders (optional) |

> ⚠️ `INSFORGE_API_KEY` and `ADMIN_SESSION_SECRET` are full-access credentials. Keep them out of
> version control and out of anything prefixed `NEXT_PUBLIC_`.

---

## Project structure

```
app/
├── layout.tsx                 root layout — fonts, cart + auth providers, navbar, footer, toaster
├── globals.css                the entire design system (tokens → components → responsive)
├── page.tsx                   homepage — hero, category strip, featured, trending, deals
├── menu/                      full menu + [category] listing with URL-held filter state
├── item/[id]/                 gallery, variant selector, qty, notes, related items
├── deals/                     Deals 1–11 and the midnight section
├── search/                    results for ?q=…
├── cart/  checkout/           cart editing, order type, address, promo code, confirmation
├── login/                     sign in / sign up (phone-based)
│
├── profile/                   ◄ customer area (gated by middleware)
│   ├── page.tsx               stats, recent orders, edit profile, change password
│   ├── orders/                full order history with live status
│   ├── addresses/             saved addresses (max 5)
│   └── offers/                available and used promo codes
│
├── admin/                     ◄ dashboard (gated by middleware)
│   ├── page.tsx               today's revenue, AOV, status breakdown, top items
│   ├── orders/  menu/  deals/  customers/  offers/  settings/
│   ├── AdminShell.tsx         sidebar, live new-order badge
│   └── ui.tsx  admin-css.ts   shared status pills, helpers, scoped styles
│
└── api/
    ├── orders/                POST — server-side pricing, offer validation, loyalty, webhook
    ├── auth/                  signup · signin · signout · session · profile · orders ·
    │                          addresses · cart · offers · validate-offer · change-password
    └── admin/                 login · logout · stats · orders · items · categories ·
                               deals · offers · customers · upload · password

components/                    server components by default; "use client" only where needed
    Navbar · AccountMenu · Footer · Hero (+HeroSlideshow) · CategoryStrip · MenuTabBar
    MenuItemCard · DealCard · AddDealButton · QuickAddButton · ItemGallery
    ItemPurchasePanel · VariantSelector · QtyStepper · SortSelect
    CartView · CartNudge · CheckoutView · OrderCard · OrderStatusPill
    AuthTabs · ContactForm · NewsletterForm · FloatingWhatsAppButton
    Reveal (IntersectionObserver) · Toaster · MidnightBadge · SafeImage · Logo · Icons

lib/
├── insforge.ts                the four SDK clients — browser, server, auth actions, admin
├── api.ts                     ★ the data seam — every menu read goes through here
├── auth.ts                    phone↔identity mapping, validation, session helpers
├── auth-context.tsx           client-side auth state
├── offers.ts                  promo-code validation and discount maths
├── store.tsx                  cart context, localStorage persistence, delivery-fee rule
├── data.ts                    types, CATEGORIES, and the curated seed menu
├── format.ts                  money() → "Rs 1,450"
├── hours.ts                   isMidnightDealTime() — 22:30 onward, client-side only
├── sort.ts                    SORT_OPTIONS (split out so client components can import it)
└── site.ts                    brand, address, phone numbers, hours, thresholds

middleware.ts                  edge gate for /admin, /api/admin and /profile
schema.sql                     canonical table + RLS definitions
migrations/                    incremental, timestamped SQL migrations
scripts/                       seed-db · import-menu · fetch-images · audit-images
incoming/                      CSV staging + image drop folder (excluded from deploys)
```

---

## Database schema

Ten tables, every one with Row Level Security enabled.

| Table | Holds | RLS |
|---|---|---|
| `menu_items` | Items, JSONB variants, images, spicy/featured/new/trending flags, sort order | Public read where `available` |
| `categories` | Display name, image, sort order | Public read |
| `deals` | Deal name, price, includes[], midnight/featured flags | Public read where `available` |
| `customers` | Name, phone (unique login), area, loyalty points, lifetime totals | Own row only |
| `customer_addresses` | Label, street, area, landmark, default flag | Own rows only |
| `orders` | Order number, status, type, items JSONB, subtotal, fee, discount, total | Anyone inserts; own rows read |
| `saved_carts` | One recoverable cart per customer | Own row only |
| `offers` | Code, percentage/fixed discount, min order, max uses, members-only, expiry | Public read where `active` |
| `used_offers` | Redemption ledger, unique per customer + offer | Own rows only |
| `admin_users` | Username + bcrypt hash | Server only |

Order status is a checked enum: `new · confirmed · preparing · out_for_delivery · delivered · cancelled`.

> `schema.sql` is the **target** shape and uses `CREATE TABLE IF NOT EXISTS`. Against an existing
> database, apply the files in `migrations/` — not `schema.sql` — and keep the two in step.

---

## Admin dashboard

`/admin` is protected at the edge by `middleware.ts`. Pages redirect to the login screen; API
routes return a flat `401` so a dashboard `fetch` fails loudly instead of parsing a login page as
JSON.

The session is a signed, self-contained cookie — `<payload>.<hmac>`, HMAC-SHA256 via WebCrypto —
so the edge can verify it **without a database round trip on every request**. One cookie, one
claim, one expiry, no JWT dependency. Admin credentials live in `admin_users` as a bcrypt hash and
are entirely separate from customer auth.

---

## Business rules

**Prices** — integer PKR throughout, formatted by `money()` as `Rs 1,450`. Cards show
`From Rs <min>` for multi-variant items; the detail page shows the selected variant's price.

**Cart** — lines are keyed by `itemId + variantLabel`, so the same burger in Regular and Large are
two independent lines. State persists to `localStorage` and is read back **after mount**, so the
server-rendered nav badge never causes a hydration mismatch. Deals are added as a single flat line
with no variant.

**Delivery fee** — one rule, one function (`deliveryFeeFor()` in `lib/store.tsx`), used by both
`/cart` and `/checkout`: **Rs 0 at or above Rs 1,500, otherwise Rs 100**, and always Rs 0 for
pickup.

**Order pricing** — `POST /api/orders` re-prices the entire cart **against the database**. Item
prices, the delivery fee and any promo discount are all recomputed server-side, so a tampered
client payload cannot change what an order costs. A session, if there is one, is read from the auth
cookies rather than the request body — a `customer_id` in the body could be anyone's.

**Loyalty** — one point per Rs 100 spent, credited when the order is written.

**Promo codes** — validated server-side against `offers`: active, unexpired, under its usage cap,
above its minimum order, and — for members-only codes — not already redeemed by that customer.

**Midnight deals** — `isMidnightDealTime()` reads the visitor's clock and is only ever called from
`useEffect`. The badge renders "Available after 10:30 PM" on the server and flips to "Available
now" after 22:30 local.

**Kitchen webhook** — a placed order is forwarded to n8n via `after()`, so it runs once the
response has flushed. A slow or dead webhook never makes a customer wait and never fails their
order.

**Hero** — if `public/videos/hero.mp4` exists the hero renders a muted autoplay/loop/playsInline
video; otherwise it falls back to a client-side crossfade slideshow. No code change to switch:

```bash
ffmpeg -i source.mov -an -vf "scale=-2:1080" -c:v libx264 -crf 23 \
       -movflags +faststart public/videos/hero.mp4
ffmpeg -i public/videos/hero.mp4 -ss 2 -frames:v 1 public/images/hero-poster.jpg
```

**Images** — `next/image` with `remotePatterns` allowing the InsForge storage host, its CDN and
Unsplash. `components/SafeImage.tsx` swaps in `public/images/placeholder.svg` on any load error, so
a dead URL never renders as a broken image.

---

## Managing the menu

Day to day, use the **admin dashboard** — `/admin/menu` creates, edits, reorders, uploads photos
for and toggles availability on both items and categories.

For a **bulk import**, the CSV pipeline is still there:

```bash
cp incoming/menu-template.csv incoming/menu.csv   # one row per item
#   drop the photos into incoming/images/
npm run import-menu
```

The script is dependency-free: it parses the CSV quote-aware, validates every row, skips bad rows
with a per-row reason, slugs unique ids, optimises photos into `public/images/menu/`, falls back to
a placeholder for missing images, and regenerates `lib/generated-items.ts` from scratch. Safe to
re-run any time. Then `npm run seed` pushes the result into Postgres and uploads the images to the
`menu-images` bucket — upserting by primary key and **preserving existing `available` flags**, so a
sold-out item does not silently come back in stock.

---

## Design system

Everything lives in `app/globals.css`, organised into sixteen numbered sections from tokens to
responsive rules.

```
--bg #12100f   --bg-alt #1b1817   --cream #f6efe3   --muted #a89e93
--accent #c8102e (crimson)        --accent-warm #e8a33d (gold)
--hairline #2c2724
```

Type is **Oswald** (condensed display, uppercase, tight tracking) over **Inter** (body), loaded
with `next/font/google`. Prices use tabular figures. Dark surfaces alternate with cream sections,
joined by subtle `clip-path` diagonal dividers as a nod to the printed menu.

Motion: staggered hero entrance, IntersectionObserver fade-up reveals (`<Reveal>` /
`<Reveal group>`), card hover image crossfade, button fill-sweep, sliding tab underline — all of it
collapsing under `prefers-reduced-motion: reduce`.

Layout is mobile-first: the grid steps 4 → 3 → 2 → 1, the nav becomes a hamburger drawer under
820px, cart and checkout stack, and the category tab bar scrolls horizontally. Checked down to
375px.

---

## Deployment

Live at **[masterchef.insforge.site](https://masterchef.insforge.site/)**.

```bash
npm run build     # type-checked production build
npm run start     # serve it
```

Deploys as a standard Next.js application. Set every variable from
[Environment variables](#environment-variables) in the hosting provider's dashboard — the app
throws a clear error if `NEXT_PUBLIC_INSFORGE_URL` is missing, rather than failing mysteriously at
request time. `.vercelignore` excludes `incoming/`, which is local-only staging worth ~46 MB in the
deployment bundle.

---

## Scripts reference

| Script | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build, fully type-checked |
| `npm run start` | Serve the production build |
| `npm run seed` | Push the menu into InsForge, upload photos, ensure the admin user |
| `npm run import-menu` | Import items from `incoming/menu.csv` — see [incoming/README.md](incoming/README.md) |

---

<div align="center">

**MASTER CHEF** · Peshawar

*Hot and Delicious — Full of Flavors*

### [masterchef.insforge.site](https://masterchef.insforge.site/)

</div>
#   m a s t e r c h e f  
 