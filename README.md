🍔 MASTER CHEF

Hot and Delicious — Full of Flavors

A production restaurant ordering platform for a Peshawar fast-food & continental kitchen — storefront, customer accounts, loyalty, promo codes, and a full admin dashboard.

🔗 Live Site

View the Live Site →








📍 Gulbahar No. 3, Near Jan Bakers, Ishrat Cinema Road, Peshawar
📞 0345-0676764 · 0315-0565515

📚 Table of Contents

Overview

Features

Tech Stack

Architecture

Getting Started

Environment Variables

Project Structure

Database Schema

Admin Dashboard

Business Rules

Managing the Menu

Design System

Deployment

Scripts Reference

Overview

Master Chef is a complete, end-to-end ordering website for a real restaurant.

A visitor can:

Browse the menu by category

Pick a size

Build a cart

Apply a promo code

Check out for delivery or pickup

A returning customer can:

Sign in with their phone number

Track orders

Save addresses

Collect loyalty points

Unlock members-only offers

Behind /admin, the restaurant can manage:

Live orders

Menu and categories

Deals

Promo codes

Customer records

Every price, item, deal, and order lives in Postgres. Nothing on the storefront is hardcoded, and orders are priced server-side against the database rather than against numbers sent by the browser.

Built with the Next.js App Router

Server components are used by default, with "use client" only where interaction genuinely requires it. The project uses a single hand-written design system in app/globals.css.

No CSS framework, icon library, or UI kit is used.

Features

🛒 Storefront

Feature

Description

Menu browsing

Eight categories, section-per-category page with a sticky scroll-spy tab bar

Category pages

Subcategory filter pills + sort control, with all state held in the URL

Item detail

Image gallery, variant selector, quantity stepper, special-instruction notes, related items

Search

Search across the live menu at /search?q=…

Deals

Deals 1–11 plus a time-gated "After 10:30 PM" midnight section

Cart

Variant-aware lines, localStorage persistence, hydration-safe badge, live delivery-fee preview

Checkout

Delivery or pickup, saved-address picker, promo code validation, Cash on Delivery

WhatsApp

Floating one-tap order button pre-filled with a greeting

👤 Customer Accounts

Phone-number sign-in — 03XX-XXXXXXX is the identifier; no email required

Order history — live status pills: new → confirmed → preparing → out for delivery → delivered

Saved addresses — up to five, with a default, label, and landmark

Loyalty points — one point per Rs 100 spent, credited when an order is placed

Members-only offers — surfaced in the profile and validated at checkout

Server-side cart recovery — a signed-in customer's cart follows them across devices

🔐 Admin Dashboard

Dashboard — today's orders, revenue, average order value, status breakdown, top-selling items

Orders — live queue with a new-order badge, status transitions, and one-tap call-the-customer

Menu — create, edit, reorder, and toggle availability for items and categories, with image upload

Deals — full CRUD, including midnight and featured flags

Customers — searchable directory with lifetime orders, spend, and loyalty balance

Offers — promo codes with percentage/fixed discounts, minimum order, usage caps, and expiry

Settings — change the admin password

Tech Stack

Layer

Choice

Why

Framework

Next.js 16 (App Router)

Server components, route handlers, edge middleware

UI

React 19 + TypeScript 5

Strict types end to end

Backend

InsForge

Postgres, auth, storage, and RLS from one platform

Database

PostgreSQL with Row Level Security

Customers can only ever read their own rows

Storage

InsForge Storage (menu-images)

Menu photography, served via CDN

Auth

InsForge Auth + signed HMAC cookie

Separate customer and admin identity systems

Styling

Hand-written CSS in app/globals.css

One design system, zero framework weight

Fonts

Oswald + Inter via next/font/google

Self-hosted, no layout shift

Automation

n8n webhook

Orders forwarded to the kitchen after the response flushes

Architecture

┌─────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                │
│  Server-rendered pages · Cart context (localStorage)               │
│  httpOnly auth cookies — no token ever reaches JavaScript           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                       middleware.ts (edge gate)                     │
│  /admin/* /api/admin/* → signed admin cookie, else 401/redirect     │
│  /profile/* → customer session cookie, else /login                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼─────────┐
       │  lib/api.ts │ │ /api/auth/*│ │ /api/admin/* │
       │  menu reads │ │  customer  │ │ admin scope  │
       │  (admin key)│ │   scope    │ │  (admin key) │
       └──────┬──────┘ └─────┬──────┘ └────┬─────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    InsForge — Postgres + Storage                    │
│  menu_items · categories · deals · customers · customer_addresses  │
│  orders · saved_carts · offers · used_offers · admin_users          │
└─────────────────────────────────────────────────────────────────────┘

Four Clients, One Rule: Use the Right Scope

lib/insforge.ts exposes exactly four entry points. Picking the wrong one is the difference between a safe query and a data leak.

Client

Runs In

Scope

insforgeBrowser()

Browser

Reads the session cookie. auth is deliberately reduced — sign-in cannot happen here

insforgeServer(cookies)

Server components, route handlers

Runs as the signed-in customer, with RLS applied

authActions(cookies)

Route handlers only

signUp / signIn / signOut; writes httpOnly cookies and strips tokens from the response

insforgeAdmin()

Server only

Project API key, bypasses RLS — never importable from a client component

lib/api.ts carries a hard runtime guard that throws if it is ever evaluated in a browser, so the admin key cannot be pulled into a client bundle by an accidental import.

The lib/api.ts Seam

Every page and component reads menu data through lib/api.ts and nothing else.

It began life as a mock layer and was swapped to InsForge Postgres without a single caller changing — signatures, filtering, and sorting still live there by design.

getItems({ category, subcategory, sort, query, limit })
// /menu, /menu/[category], /search

getItemById(id)
// /item/[id]

getFeatured()
getNewArrivals()
getTrending()
// homepage sections

getRelated(id)
// "You might also like"

getCategories()
getCategoryBySlug(slug)
// nav, category pages, homepage strip

getDeals()
getMidnightDeals()
getDealById(id)
// /deals, homepage

Reads use the admin client on purpose: RLS grants anonymous callers only available = true rows, but the storefront needs to render sold-out items greyed out with a Sold Out badge rather than hide them.

Getting Started

Prerequisites

Node.js 20+ — the seed script relies on --env-file

An InsForge project — insforge.dev

Installation

# 1. Clone and install
git clone master-chef
cd master-chef
npm install

# 2. Configure
# Create .env.local with your InsForge keys.

# 3. Create the schema
# Apply schema.sql, then everything in migrations/ in filename order.

# 4. Seed the menu, upload photos, and create the admin user
npm run seed

# 5. Run the application
npm run dev
# → http://localhost:3000

Application Routes

Area

Route

Storefront

/

Customer area

/profile

Admin dashboard

/admin

Sign in as admin with whatever you set as ADMIN_DEFAULT_PASSWORD, then change it under Settings.

Environment Variables

Create .env.local in the project root.

It is git-ignored, and no key is ever hardcoded.

Variable

Exposure

Purpose

NEXT_PUBLIC_INSFORGE_URL

Public

InsForge API base URL

NEXT_PUBLIC_INSFORGE_ANON_KEY

Public

Anonymous key — RLS-constrained

INSFORGE_API_KEY

Server only

Admin key. Bypasses RLS — must never be NEXT_PUBLIC_

ADMIN_SESSION_SECRET

Server only

HMAC secret signing the admin session cookie

ADMIN_DEFAULT_PASSWORD

Server only

Password for the admin user created by npm run seed

NEXT_PUBLIC_WEBHOOK_URL

Public

n8n endpoint that receives new orders (optional)

⚠️ INSFORGE_API_KEY and ADMIN_SESSION_SECRET are full-access credentials.

Keep them out of version control and out of anything prefixed NEXT_PUBLIC_.

Project Structure

master-chef/
│
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   │
│   ├── menu/
│   │   └── [category]/
│   ├── item/
│   │   └── [id]/
│   ├── deals/
│   ├── search/
│   ├── cart/
│   ├── checkout/
│   ├── login/
│   │
│   ├── profile/
│   │   ├── page.tsx
│   │   ├── orders/
│   │   ├── addresses/
│   │   └── offers/
│   │
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── orders/
│   │   ├── menu/
│   │   ├── deals/
│   │   ├── customers/
│   │   ├── offers/
│   │   ├── settings/
│   │   ├── AdminShell.tsx
│   │   ├── ui.tsx
│   │   └── admin-css.ts
│   │
│   └── api/
│       ├── orders/
│       ├── auth/
│       │   ├── signup
│       │   ├── signin
│       │   ├── signout
│       │   ├── session
│       │   ├── profile
│       │   ├── orders
│       │   ├── addresses
│       │   ├── cart
│       │   ├── offers
│       │   ├── validate-offer
│       │   └── change-password
│       │
│       └── admin/
│           ├── login
│           ├── logout
│           ├── stats
│           ├── orders
│           ├── items
│           ├── categories
│           ├── deals
│           ├── offers
│           ├── customers
│           ├── upload
│           └── password
│
├── components/
│   ├── Navbar
│   ├── AccountMenu
│   ├── Footer
│   ├── Hero
│   ├── HeroSlideshow
│   ├── CategoryStrip
│   ├── MenuTabBar
│   ├── MenuItemCard
│   ├── DealCard
│   ├── AddDealButton
│   ├── QuickAddButton
│   ├── ItemGallery
│   ├── ItemPurchasePanel
│   ├── VariantSelector
│   ├── QtyStepper
│   ├── SortSelect
│   ├── CartView
│   ├── CartNudge
│   ├── CheckoutView
│   ├── OrderCard
│   ├── OrderStatusPill
│   ├── AuthTabs
│   ├── ContactForm
│   ├── NewsletterForm
│   ├── FloatingWhatsAppButton
│   ├── Reveal
│   ├── Toaster
│   ├── MidnightBadge
│   ├── SafeImage
│   ├── Logo
│   └── Icons
│
├── lib/
│   ├── insforge.ts
│   ├── api.ts
│   ├── auth.ts
│   ├── auth-context.tsx
│   ├── offers.ts
│   ├── store.tsx
│   ├── data.ts
│   ├── format.ts
│   ├── hours.ts
│   ├── sort.ts
│   └── site.ts
│
├── middleware.ts
├── schema.sql
├── migrations/
│   └── <timestamped SQL migrations>
│
├── scripts/
│   ├── seed-db
│   ├── import-menu
│   ├── fetch-images
│   └── audit-images
│
├── incoming/
│   ├── menu-template.csv
│   ├── menu.csv
│   └── images/
│
├── public/
│   ├── images/
│   └── videos/
│
├── .env
├── .env.local
├── .gitignore
├── .vercelignore
├── AGENTS.md
├── CLAUDE.md
├── fix-images-prompt.md
├── insforge.toml
├── master-chef-master-prompt.md
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json

Important Project Files

File / Folder

Purpose

app/

Next.js App Router pages and API routes

components/

Reusable UI components

lib/

Data access, auth, cart, formatting, and site logic

migrations/

Incremental timestamped SQL migrations

scripts/

Database seeding, menu importing, image fetching, and audits

incoming/

Local CSV staging and image drop folder

public/

Static images and videos

middleware.ts

Edge gate for /admin, /api/admin, and /profile

schema.sql

Canonical database table + RLS definitions

Database Schema

Ten tables are used, with Row Level Security enabled.

Table

Holds

RLS

menu_items

Items, JSONB variants, images, spicy/featured/new/trending flags, sort order

Public read where available

categories

Display name, image, sort order

Public read

deals

Deal name, price, includes[], midnight/featured flags

Public read where available

customers

Name, phone, area, loyalty points, lifetime totals

Own row only

customer_addresses

Label, street, area, landmark, default flag

Own rows only

orders

Order number, status, type, items JSONB, subtotal, fee, discount, total

Anyone inserts; own rows read

saved_carts

One recoverable cart per customer

Own row only

offers

Code, percentage/fixed discount, min order, max uses, members-only, expiry

Public read where active

used_offers

Redemption ledger, unique per customer + offer

Own rows only

admin_users

Username + bcrypt hash

Server only

Order Status

Order status is a checked enum:

new
confirmed
preparing
out_for_delivery
delivered
cancelled

schema.sql is the target shape and uses CREATE TABLE IF NOT EXISTS.

Against an existing database, apply the files in migrations/ — not schema.sql — and keep the two in step.

Admin Dashboard

/admin is protected at the edge by middleware.ts.

Pages redirect to the login screen.

API routes return a flat 401.

A dashboard fetch therefore fails loudly instead of parsing a login page as JSON.

The session is a signed, self-contained cookie using HMAC-SHA256 via WebCrypto.

The edge can verify the session without a database round trip on every request.

Admin credentials live in admin_users as a bcrypt hash.

Customer authentication and admin authentication are entirely separate.

Admin Areas

/admin
├── Dashboard
├── Orders
├── Menu
├── Deals
├── Customers
├── Offers
└── Settings

Business Rules

Prices

Integer PKR throughout.

money() formats prices as Rs 1,450.

Cards show From Rs for multi-variant items.

The detail page shows the selected variant's price.

Cart

Lines are keyed by itemId + variantLabel.

The same burger in Regular and Large are two independent lines.

State persists to localStorage.

State is read back after mount so the server-rendered nav badge never causes a hydration mismatch.

Deals are added as a single flat line with no variant.

Delivery Fee

The single delivery-fee rule is implemented by deliveryFeeFor() in lib/store.tsx.

Rs 0 at or above Rs 1,500

Rs 100 below Rs 1,500

Rs 0 for pickup

The same function is used by /cart and /checkout.

Order Pricing

POST /api/orders re-prices the entire cart against the database.

Item prices are recomputed server-side.

Delivery fee is recomputed server-side.

Promo discount is recomputed server-side.

A tampered client payload cannot change what an order costs.

The customer session is read from auth cookies rather than the request body.

A customer_id in the body could otherwise be anyone's.

Loyalty

One point per Rs 100 spent.

Points are credited when the order is written.

Promo Codes

Promo codes are validated server-side against offers:

Active

Unexpired

Under usage cap

Above minimum order

Members-only codes must not already be redeemed by that customer

Midnight Deals

isMidnightDealTime() reads the visitor's clock and is only ever called from useEffect.

Before 22:30: Available after 10:30 PM

After 22:30: Available now

Kitchen Webhook

A placed order is forwarded to n8n via after().

This means:

The webhook runs after the response has flushed.

A slow or dead webhook never makes a customer wait.

A webhook failure never fails the order.

Hero

If public/videos/hero.mp4 exists, the hero renders a muted autoplay/loop/playsInline video.

Otherwise, it falls back to a client-side crossfade slideshow.

ffmpeg -i source.mov -an -vf "scale=-2:1080" -c:v libx264 -crf 23 -movflags +faststart public/videos/hero.mp4

ffmpeg -i public/videos/hero.mp4 -ss 2 -frames:v 1 public/images/hero-poster.jpg

Images

next/image uses remotePatterns allowing:

InsForge storage host

Its CDN

Unsplash

components/SafeImage.tsx swaps in public/images/placeholder.svg on any load error, so a dead URL never renders as a broken image.

Managing the Menu

Day-to-day menu management should be done through the admin dashboard at /admin/menu.

It supports:

Creating items

Editing items

Reordering items

Uploading photos

Toggling availability

Managing categories

Bulk Import

The CSV pipeline is still available:

cp incoming/menu-template.csv incoming/menu.csv
# One row per item

# Drop photos into:
incoming/images/

npm run import-menu

The script:

Parses the CSV quote-aware

Validates every row

Skips bad rows with a per-row reason

Slugs unique IDs

Optimises photos into public/images/menu/

Falls back to a placeholder for missing images

Regenerates lib/generated-items.ts from scratch

Is safe to re-run

Then:

npm run seed

This pushes the result into Postgres and uploads images to the menu-images bucket.

It upserts by primary key while preserving existing available flags, so a sold-out item does not silently come back in stock.

Design System

Everything lives in app/globals.css, organised into sixteen numbered sections from tokens to responsive rules.

Design Tokens

--bg          #12100f
--bg-alt      #1b1817
--cream       #f6efe3
--muted       #a89e93
--accent      #c8102e
--accent-warm #e8a33d
--hairline    #2c2724

Typography

Oswald — condensed display, uppercase, tight tracking

Inter — body text

Prices use tabular figures.

Visual Style

Dark surfaces alternate with cream sections.

Subtle clip-path diagonal dividers reference the printed menu.

Hero entrance uses staggered animation.

IntersectionObserver handles fade-up reveals.

Cards use image crossfade on hover.

Buttons use fill-sweep animation.

Tabs use a sliding underline.

Motion collapses under prefers-reduced-motion: reduce.

Responsive Layout

The layout is mobile-first:

Desktop → 4 columns
Tablet  → 3 columns
Small   → 2 columns
Mobile  → 1 column

Additional responsive behavior:

Navigation becomes a hamburger drawer under 820px.

Cart and checkout stack.

Category tabs scroll horizontally.

Checked down to 375px.

Deployment

The application is live at:

masterchef.insforge.site

Production Commands

npm run build
npm run start

npm run build performs the type-checked production build.

Deploys as a standard Next.js application.

Set every variable from Environment Variables in the hosting provider's dashboard.

The app throws a clear error if NEXT_PUBLIC_INSFORGE_URL is missing rather than failing mysteriously at request time.

.vercelignore excludes incoming/, which is local-only staging worth approximately 46 MB in the deployment bundle.

Scripts Reference

Script

What it does

npm run dev

Development server on port 3000

npm run build

Production build, fully type-checked

npm run start

Serve the production build

npm run seed

Push the menu into InsForge, upload photos, ensure the admin user

npm run import-menu

Import items from incoming/menu.csv

For the full import workflow, see incoming/README.md.

🍔 Master Chef

Peshawar · Hot and Delicious — Full of Flavors

Visit the live site →