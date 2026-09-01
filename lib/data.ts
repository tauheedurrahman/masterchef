/**
 * MASTER CHEF — menu source of truth.
 *
 * BASE_ITEMS / BASE_DEALS below are the real printed menu, hand-curated.
 * GENERATED_ITEMS come from `npm run import-menu` (see scripts/import-menu.mjs)
 * and live in lib/generated-items.ts, which is rewritten wholesale on every run.
 *
 * Pages never import this file for data — they go through lib/api.ts, which is
 * the single seam where the mock layer gets swapped for a real backend.
 */

import { GENERATED_ITEMS } from "./generated-items";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type CategorySlug =
  | "burgers"
  | "shawarma"
  | "paratha-roll"
  | "fries"
  | "appetizers"
  | "continental"
  | "pizza"
  | "platters";

export interface Variant {
  /** "Regular" | "Large" | "Family" | "Small" | "Medium" | "10 Pcs" ... */
  label: string;
  /** PKR, integer. */
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: CategorySlug;
  /** e.g. "Zinger", "Chicken", "Rolls", "Rice", "Pasta" */
  subcategory: string;
  /** ALWAYS at least one. Single-price items => [{ label: "Regular", price: X }] */
  variants: Variant[];
  description: string;
  /** [primary, hover] */
  images: [string, string];
  spicy?: boolean;
  featured?: boolean;
  isNew?: boolean;
  trending?: boolean;
}

export interface Deal {
  id: string;
  /** "Deal 1", "Midnight Deal 2" */
  name: string;
  /** flat price, no variants */
  price: number;
  includes: string[];
  image: string;
  /** true => only surfaced under the "After 10:30 PM" section */
  midnight?: boolean;
  featured?: boolean;
}

export interface CategoryInfo {
  slug: CategorySlug;
  name: string;
  tagline: string;
  image: string;
}

/* ------------------------------------------------------------------ *
 * Image helpers
 * ------------------------------------------------------------------ */

/** Build a stable Unsplash delivery URL for a known food photo id. */
export function unsplash(id: string, w = 900): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
}

/** Rendered by <SafeImage> when a remote photo fails to load. */
export const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

const P = {
  burger1: unsplash("photo-1568901346375-23c9450c58cd"),
  burger2: unsplash("photo-1550547660-d9450f859349"),
  burger3: unsplash("photo-1571091718767-18b5b1457add"),
  burger4: unsplash("photo-1594212699903-ec8a3eca50f5"),
  burger5: unsplash("photo-1585032226651-759b368d7246"),
  burger6: unsplash("photo-1541592106381-b31e9677c0e5"),
  burger7: unsplash("photo-1567620905732-2d1ec7ab7445"),
  fries1: unsplash("photo-1574071318508-1cdbab80d002"),
  fries2: unsplash("photo-1593560708920-61dd98c46a4e"),
  fries3: unsplash("photo-1585238342024-78d387f4a707"),
  wrap1: unsplash("photo-1603360946369-dc9bb6258143"),
  wrap2: unsplash("photo-1626700051175-6818013e1d4f"),
  wrap3: unsplash("photo-1626082927389-6cd097cdc6ec"),
  chicken1: unsplash("photo-1600628421055-4d30de868b8f"),
  chicken2: unsplash("photo-1633945274405-b6c8069047b0"),
  chicken3: unsplash("photo-1562967916-eb82221dfb92"),
  chicken4: unsplash("photo-1626645738196-c2a7c87a8f58"),
  noodles: unsplash("photo-1529042410759-befb1204b468"),
  bowl: unsplash("photo-1546069901-ba9599a7e63c"),
  pasta1: unsplash("photo-1604382354936-07c5d9983bd3"),
  pasta2: unsplash("photo-1621996346565-e3dbc646d9a9"),
  rice: unsplash("photo-1608219992759-8d74ed8d76eb"),
  pizza1: unsplash("photo-1565299624946-b28f40a0ae38"),
  pizza2: unsplash("photo-1513104890138-7c749659a591"),
};

/** Big crops for the hero slideshow. */
export const HERO_IMAGES = [
  {
    src: unsplash("photo-1568901346375-23c9450c58cd", 1600),
    alt: "Flame-grilled zinger burger stacked high",
  },
  {
    src: unsplash("photo-1513104890138-7c749659a591", 1600),
    alt: "Wood-fired pizza fresh out of the oven",
  },
  {
    src: unsplash("photo-1626082927389-6cd097cdc6ec", 1600),
    alt: "Chicken shawarma wrap sliced open",
  },
];

/* ------------------------------------------------------------------ *
 * Categories (curated display order)
 * ------------------------------------------------------------------ */

export const CATEGORIES: CategoryInfo[] = [
  {
    slug: "burgers",
    name: "Burgers",
    tagline: "Stacked, crispy, unapologetically messy",
    image: P.burger1,
  },
  {
    slug: "shawarma",
    name: "Shawarma",
    tagline: "Slow-turned chicken, wrapped hot",
    image: P.wrap1,
  },
  {
    slug: "paratha-roll",
    name: "Paratha Roll",
    tagline: "Flaky paratha, loaded fillings",
    image: P.wrap2,
  },
  {
    slug: "pizza",
    name: "Pizza",
    tagline: "Hand-stretched and blistered",
    image: P.pizza1,
  },
  {
    slug: "fries",
    name: "Fries",
    tagline: "Golden, salted, loaded on request",
    image: P.fries1,
  },
  {
    slug: "appetizers",
    name: "Appetizers",
    tagline: "Wings, nuggets and buckets",
    image: P.chicken2,
  },
  {
    slug: "continental",
    name: "Continental",
    tagline: "Chowmein, pasta, rice and more",
    image: P.noodles,
  },
  {
    slug: "platters",
    name: "Platters",
    tagline: "Built for sharing",
    image: P.chicken3,
  },
];

/** Curated subcategory order per category — anything else sorts after, A to Z. */
const SUBCATEGORY_ORDER: Record<CategorySlug, string[]> = {
  burgers: ["Zinger", "Chicken", "Signature"],
  shawarma: ["Chicken", "Zinger", "Arabic", "Special"],
  "paratha-roll": ["Chicken", "Zinger", "Turkish"],
  fries: ["Classic", "Loaded"],
  appetizers: ["Fried Chicken", "Wings", "Buckets"],
  continental: ["Chinese", "Rice", "Pasta", "Fried Chicken"],
  pizza: ["Signature", "Calzone"],
  platters: ["Sharing"],
};

/* ------------------------------------------------------------------ *
 * BASE_ITEMS — the real MASTER CHEF menu
 * ------------------------------------------------------------------ */

export const BASE_ITEMS: MenuItem[] = [
  /* ---------------------------- BURGERS ---------------------------- */
  {
    id: "big-bun-zinger-burger",
    name: "Big Bun Zinger Burger",
    category: "burgers",
    subcategory: "Zinger",
    variants: [{ label: "Regular", price: 350 }],
    description:
      "Our house zinger fillet, marinated overnight and fried to a shatter, tucked into an oversized toasted bun.",
    images: [P.burger1, P.burger3],
    spicy: true,
    featured: true,
  },
  {
    id: "zinger-cheese-burger",
    name: "Zinger Cheese Burger",
    category: "burgers",
    subcategory: "Zinger",
    variants: [
      { label: "Regular", price: 400 },
      { label: "Large", price: 450 },
    ],
    description:
      "Crispy zinger fillet with a slab of melting cheddar, crunchy lettuce and a swipe of garlic mayo.",
    images: [P.burger2, P.burger1],
    spicy: true,
    featured: true,
    trending: true,
  },
  {
    id: "zinger-patty-burger",
    name: "Zinger & Patty Burger",
    category: "burgers",
    subcategory: "Zinger",
    variants: [
      { label: "Regular", price: 550 },
      { label: "Large", price: 600 },
    ],
    description:
      "Two textures in one bun — a crunchy zinger fillet stacked over a juicy grilled chicken patty.",
    images: [P.burger3, P.burger4],
    spicy: true,
  },
  {
    id: "double-zinger-burger",
    name: "Double Zinger Burger",
    category: "burgers",
    subcategory: "Zinger",
    variants: [
      { label: "Regular", price: 650 },
      { label: "Large", price: 700 },
    ],
    description:
      "Twice the fillet, twice the crunch. Built for an appetite that skipped lunch.",
    images: [P.burger4, P.burger5],
    spicy: true,
    trending: true,
  },
  {
    id: "mc-signature-burger",
    name: "MC Signature Burger",
    category: "burgers",
    subcategory: "Signature",
    variants: [{ label: "Regular", price: 700 }],
    description:
      "The chef's own build — zinger fillet, smoked cheese, caramelised onion and our signature sauce.",
    images: [P.burger5, P.burger2],
    featured: true,
    isNew: true,
  },
  {
    id: "chicken-burger",
    name: "Chicken Burger",
    category: "burgers",
    subcategory: "Chicken",
    variants: [
      { label: "Regular", price: 250 },
      { label: "Large", price: 300 },
    ],
    description:
      "The everyday classic — tender grilled chicken, fresh salad and creamy mayo in a soft milk bun.",
    images: [P.burger6, P.burger7],
  },
  {
    id: "chicken-cheese-burger",
    name: "Chicken Cheese Burger",
    category: "burgers",
    subcategory: "Chicken",
    variants: [
      { label: "Regular", price: 300 },
      { label: "Large", price: 350 },
    ],
    description:
      "Grilled chicken under a blanket of cheese that melts into every single bite.",
    images: [P.burger7, P.burger6],
  },
  {
    id: "chicken-patty-burger",
    name: "Chicken Patty Burger",
    category: "burgers",
    subcategory: "Chicken",
    variants: [
      { label: "Regular", price: 200 },
      { label: "Large", price: 250 },
    ],
    description:
      "A crisp golden chicken patty with ketchup and mayo — the quick, honest hunger fix.",
    images: [P.burger6, P.burger1],
  },
  {
    id: "chicken-zinger-burger",
    name: "Chicken Zinger Burger",
    category: "burgers",
    subcategory: "Zinger",
    variants: [{ label: "Regular", price: 300 }],
    description:
      "Spiced zinger fillet, shredded lettuce and cool mayo — the one people come back for.",
    images: [P.burger3, P.burger2],
    spicy: true,
  },

  /* -------------------------- APPETIZERS --------------------------- */
  {
    id: "chicken-nuggets",
    name: "Chicken Nuggets",
    category: "appetizers",
    subcategory: "Fried Chicken",
    variants: [
      { label: "5 Pcs", price: 300 },
      { label: "10 Pcs", price: 580 },
    ],
    description:
      "Hand-breaded chicken nuggets, fried golden and served with a dip on the side.",
    images: [P.chicken1, P.chicken3],
  },
  {
    id: "chicken-bucket-12-pcs",
    name: "Chicken Bucket (12 Pcs)",
    category: "appetizers",
    subcategory: "Buckets",
    variants: [{ label: "Bucket", price: 1800 }],
    description:
      "Twelve pieces of crispy fried chicken piled into a bucket — the centrepiece of a family table.",
    images: [P.chicken3, P.chicken2],
    featured: true,
  },
  {
    id: "hot-wings-10-pcs",
    name: "Hot Wings (10 Pcs)",
    category: "appetizers",
    subcategory: "Wings",
    variants: [{ label: "10 Pcs", price: 700 }],
    description:
      "Ten fiery wings tossed in our chilli glaze — sticky fingers guaranteed.",
    images: [P.chicken2, P.chicken4],
    spicy: true,
    trending: true,
  },
  {
    id: "hot-shots",
    name: "Hot Shots",
    category: "appetizers",
    subcategory: "Fried Chicken",
    variants: [
      { label: "5 Pcs", price: 400 },
      { label: "10 Pcs", price: 750 },
    ],
    description:
      "Bite-sized boneless chicken with a serious kick — dangerously easy to finish.",
    images: [P.chicken4, P.chicken1],
    spicy: true,
  },

  /* ----------------------------- FRIES ----------------------------- */
  {
    id: "french-fries",
    name: "French Fries",
    category: "fries",
    subcategory: "Classic",
    variants: [
      { label: "Regular", price: 200 },
      { label: "Large", price: 350 },
    ],
    description:
      "Thick-cut potatoes fried twice for a crisp shell and a fluffy middle, finished with fine salt.",
    images: [P.fries1, P.fries2],
  },
  {
    id: "mayo-fries",
    name: "Mayo Fries",
    category: "fries",
    subcategory: "Loaded",
    variants: [
      { label: "Regular", price: 250 },
      { label: "Large", price: 450 },
    ],
    description: "Hot fries drenched in cool, creamy house mayo.",
    images: [P.fries2, P.fries3],
  },
  {
    id: "family-fries",
    name: "Family Fries",
    category: "fries",
    subcategory: "Classic",
    variants: [{ label: "Family", price: 350 }],
    description:
      "A generous share-tray of golden fries — order one, everyone reaches in.",
    images: [P.fries3, P.fries1],
  },
  {
    id: "masala-fries",
    name: "Masala Fries",
    category: "fries",
    subcategory: "Loaded",
    variants: [{ label: "Regular", price: 299 }],
    description:
      "Crisp fries dusted in our roasted masala blend — Peshawar's favourite way to eat potatoes.",
    images: [P.fries1, P.fries3],
    spicy: true,
    isNew: true,
  },
  {
    id: "garlic-mayo-fries",
    name: "Garlic Mayo Fries",
    category: "fries",
    subcategory: "Loaded",
    variants: [{ label: "Regular", price: 350 }],
    description:
      "Golden fries under a heavy pour of roasted garlic mayo and fresh herbs.",
    images: [P.fries2, P.fries1],
  },
  {
    id: "loaded-cheese-fries",
    name: "Loaded Cheese Fries",
    category: "fries",
    subcategory: "Loaded",
    variants: [
      { label: "Regular", price: 450 },
      { label: "Large", price: 750 },
    ],
    description:
      "Fries buried under molten cheese sauce and crispy chicken bits. Bring a fork.",
    images: [P.fries3, P.fries2],
    featured: true,
    trending: true,
  },

  /* ---------------------------- SHAWARMA --------------------------- */
  {
    id: "chicken-shawarma",
    name: "Chicken Shawarma",
    category: "shawarma",
    subcategory: "Chicken",
    variants: [
      { label: "Small", price: 100 },
      { label: "Regular", price: 160 },
      { label: "Large", price: 200 },
    ],
    description:
      "Chicken shaved straight off the spit, wrapped with garlic sauce, pickles and fries.",
    images: [P.wrap1, P.wrap2],
    featured: true,
  },
  {
    id: "zinger-shawarma",
    name: "Zinger Shawarma",
    category: "shawarma",
    subcategory: "Zinger",
    variants: [
      { label: "Small", price: 200 },
      { label: "Regular", price: 250 },
      { label: "Large", price: 300 },
    ],
    description:
      "Crunchy zinger strips rolled into warm bread with hot sauce and crisp salad.",
    images: [P.wrap2, P.wrap3],
    spicy: true,
    trending: true,
  },
  {
    id: "olive-shawarma",
    name: "Olive Shawarma",
    category: "shawarma",
    subcategory: "Special",
    variants: [{ label: "Regular", price: 250 }],
    description:
      "Chicken shawarma lifted with briny black olives and a lemony garlic whip.",
    images: [P.wrap3, P.wrap1],
  },
  {
    id: "chicken-cheese-shawarma",
    name: "Chicken Cheese Shawarma",
    category: "shawarma",
    subcategory: "Chicken",
    variants: [
      { label: "Small", price: 200 },
      { label: "Regular", price: 250 },
      { label: "Large", price: 300 },
    ],
    description:
      "The classic wrap with a melting cheese layer pressed right through the middle.",
    images: [P.wrap1, P.wrap3],
  },
  {
    id: "mc-arabic-roll",
    name: "MC Arabic Roll",
    category: "shawarma",
    subcategory: "Arabic",
    variants: [{ label: "Regular", price: 550 }],
    description:
      "A heavyweight Arabic-style roll — spiced chicken, garlic toum and fries in soft khubz.",
    images: [P.wrap2, P.wrap1],
    isNew: true,
  },
  {
    id: "mc-arabic-platter",
    name: "MC Arabic Platter",
    category: "shawarma",
    subcategory: "Arabic",
    variants: [{ label: "Platter", price: 650 }],
    description:
      "Shawarma chicken plated with fries, salad, khubz and a trio of sauces.",
    images: [P.bowl, P.wrap2],
    featured: true,
  },
  {
    id: "mc-twister-roll",
    name: "MC Twister Roll",
    category: "shawarma",
    subcategory: "Special",
    variants: [{ label: "Regular", price: 600 }],
    description:
      "Zinger strips, fries and peri sauce twisted into a warm tortilla and grilled.",
    images: [P.wrap3, P.wrap2],
    isNew: true,
  },

  /* -------------------------- PARATHA ROLL ------------------------- */
  {
    id: "chicken-paratha-roll",
    name: "Chicken Paratha Roll",
    category: "paratha-roll",
    subcategory: "Chicken",
    variants: [
      { label: "Regular", price: 200 },
      { label: "Large", price: 250 },
    ],
    description:
      "Flaky hot paratha wrapped around spiced chicken, onion and green chutney.",
    images: [P.wrap2, P.wrap1],
    featured: true,
  },
  {
    id: "zinger-paratha-roll",
    name: "Zinger Paratha Roll",
    category: "paratha-roll",
    subcategory: "Zinger",
    variants: [
      { label: "Small", price: 200 },
      { label: "Regular", price: 250 },
      { label: "Large", price: 300 },
    ],
    description:
      "Crispy zinger strips folded into buttery paratha with mayo and hot sauce.",
    images: [P.wrap1, P.wrap3],
    spicy: true,
    trending: true,
  },
  {
    id: "turkish-chicken-roll",
    name: "Turkish Chicken Roll",
    category: "paratha-roll",
    subcategory: "Turkish",
    variants: [
      { label: "Small", price: 450 },
      { label: "Regular", price: 500 },
      { label: "Large", price: 550 },
    ],
    description:
      "Turkish-spiced chicken, sumac onions and yoghurt sauce in a griddled paratha.",
    images: [P.wrap3, P.wrap2],
    isNew: true,
  },
  {
    id: "chicken-cheese-paratha-roll",
    name: "Chicken Cheese Paratha Roll",
    category: "paratha-roll",
    subcategory: "Chicken",
    variants: [
      { label: "Regular", price: 250 },
      { label: "Large", price: 300 },
    ],
    description:
      "Our chicken roll with cheese melted onto the paratha before it is rolled.",
    images: [P.wrap2, P.wrap3],
  },

  /* -------------------------- CONTINENTAL -------------------------- */
  {
    id: "chicken-chowmein",
    name: "Chicken Chowmein",
    category: "continental",
    subcategory: "Chinese",
    variants: [
      { label: "Small", price: 300 },
      { label: "Regular", price: 450 },
      { label: "Large", price: 650 },
      { label: "Family", price: 1000 },
    ],
    description:
      "Wok-tossed noodles with shredded chicken, julienne vegetables and dark soy.",
    images: [P.noodles, P.bowl],
    featured: true,
  },
  {
    id: "chicken-fried-rice",
    name: "Chicken Fried Rice",
    category: "continental",
    subcategory: "Rice",
    variants: [
      { label: "Regular", price: 350 },
      { label: "Large", price: 490 },
    ],
    description:
      "Long-grain rice fried hard and fast with egg, spring onion and chicken.",
    images: [P.rice, P.noodles],
  },
  {
    id: "chicken-chilli-dry-with-rice",
    name: "Chicken Chilli Dry with Rice",
    category: "continental",
    subcategory: "Rice",
    variants: [
      { label: "Regular", price: 450 },
      { label: "Large", price: 650 },
    ],
    description:
      "Sticky chilli chicken with peppers and onion, served over steamed rice.",
    images: [P.bowl, P.rice],
    spicy: true,
  },
  {
    id: "white-sauce-pasta",
    name: "White Sauce Pasta",
    category: "continental",
    subcategory: "Pasta",
    variants: [
      { label: "Regular", price: 500 },
      { label: "Large", price: 900 },
    ],
    description:
      "Penne folded through a silky cream and cheese sauce with grilled chicken.",
    images: [P.pasta1, P.pasta2],
    trending: true,
  },
  {
    id: "red-sauce-penne-pasta",
    name: "Red Sauce Penne Pasta",
    category: "continental",
    subcategory: "Pasta",
    variants: [
      { label: "Regular", price: 450 },
      { label: "Large", price: 800 },
    ],
    description:
      "Penne in a slow-simmered tomato and herb sauce with a chilli edge.",
    images: [P.pasta2, P.pasta1],
    spicy: true,
  },
  {
    id: "lasagne",
    name: "Lasagne",
    category: "continental",
    subcategory: "Pasta",
    variants: [
      { label: "Regular", price: 500 },
      { label: "Large", price: 900 },
    ],
    description:
      "Layered pasta, chicken ragu and bechamel, baked until the top blisters.",
    images: [P.pasta2, P.bowl],
    featured: true,
    isNew: true,
  },
  {
    id: "drum-sticks",
    name: "Drum Sticks",
    category: "continental",
    subcategory: "Fried Chicken",
    variants: [
      { label: "1 Pc", price: 220 },
      { label: "3 Pcs", price: 660 },
      { label: "6 Pcs", price: 1320 },
    ],
    description:
      "Marinated overnight, breaded by hand and fried to a deep golden crunch.",
    images: [P.chicken3, P.chicken2],
  },

  /* ----------------------------- PIZZA ----------------------------- */
  {
    id: "mc-special-pizza",
    name: "MC Special Pizza",
    category: "pizza",
    subcategory: "Signature",
    variants: [
      { label: "Small", price: 600 },
      { label: "Medium", price: 900 },
      { label: "Large", price: 1500 },
    ],
    description:
      "Hand-stretched base loaded with chicken, peppers, olives and a double cheese pull.",
    images: [P.pizza1, P.pizza2],
    featured: true,
    trending: true,
  },
  {
    id: "calzone-pizza",
    name: "Calzone Pizza",
    category: "pizza",
    subcategory: "Calzone",
    variants: [
      { label: "Small", price: 600 },
      { label: "Medium", price: 900 },
    ],
    description:
      "A folded pizza packed with chicken and mozzarella, baked until golden and puffed.",
    images: [P.pizza2, P.pizza1],
    isNew: true,
  },

  /* ---------------------------- PLATTERS --------------------------- */
  {
    id: "roasted-platter",
    name: "Roasted Platter (5 Wings + 2 Bihari Rolls + Fries)",
    category: "platters",
    subcategory: "Sharing",
    variants: [{ label: "Platter", price: 950 }],
    description:
      "Five roasted wings, two bihari rolls and a mound of fries on one loaded tray.",
    images: [P.chicken3, P.chicken2],
    featured: true,
  },
];

/* ------------------------------------------------------------------ *
 * BASE_DEALS
 * ------------------------------------------------------------------ */

export const BASE_DEALS: Deal[] = [
  {
    id: "deal-1",
    name: "Deal 1",
    price: 1050,
    includes: ["2 Arabic Shawarma", "1 Reg. Drink"],
    image: P.wrap1,
    featured: true,
  },
  {
    id: "deal-2",
    name: "Deal 2",
    price: 1100,
    includes: ["3 Zinger Burger", "1 Reg. Fries", "1 Reg. Drink"],
    image: P.burger2,
    featured: true,
  },
  {
    id: "deal-3",
    name: "Deal 3",
    price: 1500,
    includes: ["5 Zinger Burger", "1 Reg. Fries"],
    image: P.burger1,
    featured: true,
  },
  {
    id: "deal-4",
    name: "Deal 4",
    price: 650,
    includes: ["2 Chicken Patty Burger", "1 Reg. Fries"],
    image: P.burger6,
  },
  {
    id: "deal-5",
    name: "Deal 5",
    price: 600,
    includes: ["1 Zinger Tower Burger", "1 Reg. Fries"],
    image: P.burger4,
  },
  {
    id: "deal-6",
    name: "Deal 6",
    price: 700,
    includes: ["1 Double Decker Burger", "1 Reg. Fries"],
    image: P.burger5,
  },
  {
    id: "deal-7",
    name: "Deal 7",
    price: 1150,
    includes: ["5 Special Shawarma", "1 Ltr Drink"],
    image: P.wrap2,
  },
  {
    id: "deal-8",
    name: "Deal 8",
    price: 1050,
    includes: ["3 MC Zinger Shawarma", "1 Ltr Drink"],
    image: P.wrap3,
  },
  {
    id: "deal-9",
    name: "Deal 9",
    price: 1400,
    includes: ["4 MC Zinger Paratha Roll", "1 Reg. Fries"],
    image: P.wrap2,
  },
  {
    id: "deal-10",
    name: "Deal 10",
    price: 2000,
    includes: [
      "3 Special Chicken Shawarma",
      "2 Chicken Paratha Roll",
      "1 Big Bun Zinger Burger",
      "1 Arabic Shawarma",
      "1.5 Ltr Drink",
    ],
    image: P.bowl,
    featured: true,
  },
  {
    id: "deal-11",
    name: "Deal 11",
    price: 1200,
    includes: ["4 Crispy Boneless Pcs"],
    image: P.chicken3,
  },
  {
    id: "midnight-deal-1",
    name: "Midnight Deal 1",
    price: 1450,
    includes: ["5 Zinger Burger", "1.5 Ltr Drink"],
    image: P.burger3,
    midnight: true,
  },
  {
    id: "midnight-deal-2",
    name: "Midnight Deal 2",
    price: 699,
    includes: ["1 Small Pizza", "1 Large Shawarma", "1 Reg. Drink"],
    image: P.pizza2,
    midnight: true,
  },
];

/* ------------------------------------------------------------------ *
 * ACTIVE MENU
 * ------------------------------------------------------------------ */

/**
 * The menu the app actually renders.
 *
 * Demo seed data + anything imported through `npm run import-menu`.
 * ---------------------------------------------------------------------
 * TO SHIP ONLY YOUR OWN IMPORTED LISTINGS, swap the line below for:
 *     export const MENU_ITEMS: MenuItem[] = [...GENERATED_ITEMS];
 * ---------------------------------------------------------------------
 */
export const MENU_ITEMS: MenuItem[] = [...BASE_ITEMS, ...GENERATED_ITEMS];

/** All deals (deals are not part of the import pipeline). */
export const DEALS: Deal[] = BASE_DEALS;

/**
 * Subcategories that actually have items in the ACTIVE menu for a category.
 * Curated order first (SUBCATEGORY_ORDER), then anything the import script
 * introduced, alphabetically. Listing filter pills are built from this.
 */
export function subcategoriesFor(category: CategorySlug): string[] {
  const present = new Set(
    MENU_ITEMS.filter((i) => i.category === category).map((i) => i.subcategory)
  );
  const curated = (SUBCATEGORY_ORDER[category] ?? []).filter((s) =>
    present.has(s)
  );
  const extra = [...present]
    .filter((s) => !curated.includes(s))
    .sort((a, b) => a.localeCompare(b));
  return [...curated, ...extra];
}

/** Lookup helper for category metadata. */
export function categoryInfo(slug: string): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export const CATEGORY_SLUGS: CategorySlug[] = CATEGORIES.map((c) => c.slug);
