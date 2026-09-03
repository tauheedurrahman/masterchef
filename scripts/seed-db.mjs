#!/usr/bin/env node
/**
 * seed-db.mjs — push the hand-curated menu into InsForge.
 *
 *   1. Parses BASE_ITEMS / BASE_DEALS straight out of lib/data.ts.
 *   2. Uploads every photo in public/images/menu/ to the `menu-images` bucket.
 *   3. Upserts menu_items and deals, pointing `images` at the storage URLs.
 *   4. Ensures an `admin` user exists (bcrypt hash of ADMIN_DEFAULT_PASSWORD).
 *
 * Safe to re-run: uploads overwrite the same object keys and rows are upserted
 * by primary key. Existing `available` flags are preserved on re-seed so a
 * sold-out item does not silently come back in stock.
 *
 *   node scripts/seed-db.mjs           (or: npm run seed)
 *
 * Reads credentials from .env.local — run with Node 20+, which loads it via
 * the npm script's --env-file flag.
 */

import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@insforge/sdk";

const ROOT = process.cwd();
const DATA_TS = path.join(ROOT, "lib", "data.ts");
const IMAGE_DIR = path.join(ROOT, "public", "images", "menu");
const BUCKET = "menu-images";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "masterchef2024";

if (!baseUrl || !apiKey) {
  console.error(
    "\nMissing NEXT_PUBLIC_INSFORGE_URL or INSFORGE_API_KEY.\n" +
      "Run with:  node --env-file=.env.local scripts/seed-db.mjs\n"
  );
  process.exit(1);
}

const db = createAdminClient({ baseUrl, apiKey });

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/* ------------------------------------------------------------------ *
 * 1. Parse lib/data.ts
 * ------------------------------------------------------------------ */

/**
 * data.ts is TypeScript, so it can't be imported from a .mjs script without a
 * build step. It is also machine-regular enough to read with a scanner: pull
 * the BASE_ITEMS / BASE_DEALS array bodies, then walk each object literal.
 */
function sliceArray(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`);
  if (start === -1) throw new Error(`${exportName} not found in lib/data.ts`);
  // Skip past the type annotation (`: MenuItem[] =`) to the assignment itself,
  // otherwise the `[]` in the type is mistaken for the array literal.
  const assign = source.indexOf("=", start);
  const open = source.indexOf("[", assign);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`Unterminated ${exportName} array`);
}

/** Split an array body into top-level `{ ... }` object literals. */
function splitObjects(body) {
  const out = [];
  let depth = 0, start = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) out.push(body.slice(start, i + 1));
    }
  }
  return out;
}

const str = (block, key) => {
  const m = block.match(new RegExp(`\\b${key}:\\s*(["'\`])([\\s\\S]*?)\\1`));
  return m ? m[2] : null;
};
const bool = (block, key) => new RegExp(`\\b${key}:\\s*true`).test(block);
const num = (block, key) => {
  const m = block.match(new RegExp(`\\b${key}:\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
};
const strList = (block, key) => {
  const m = block.match(new RegExp(`\\b${key}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/(["'`])([\s\S]*?)\1/g)].map((x) => x[2]);
};

function parseVariants(block) {
  const m = block.match(/\bvariants:\s*\[([\s\S]*?)\]/);
  if (!m) return [];
  return splitObjects(m[1]).map((v) => ({
    label: str(v, "label") ?? "Regular",
    price: num(v, "price") ?? 0,
  }));
}

function parseItems(source) {
  return splitObjects(sliceArray(source, "BASE_ITEMS")).map((b, i) => ({
    id: str(b, "id"),
    name: str(b, "name"),
    category: str(b, "category"),
    subcategory: str(b, "subcategory"),
    variants: parseVariants(b),
    description: str(b, "description") ?? "",
    images: strList(b, "images"),
    spicy: bool(b, "spicy"),
    featured: bool(b, "featured"),
    is_new: bool(b, "isNew"),
    trending: bool(b, "trending"),
    sort_order: i,
  }));
}

function parseDeals(source) {
  return splitObjects(sliceArray(source, "BASE_DEALS")).map((b) => ({
    id: str(b, "id"),
    name: str(b, "name"),
    price: num(b, "price") ?? 0,
    includes: strList(b, "includes"),
    image: str(b, "image"),
    midnight: bool(b, "midnight"),
    featured: bool(b, "featured"),
  }));
}

/* ------------------------------------------------------------------ *
 * 2. Upload images
 * ------------------------------------------------------------------ */

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** Uploads every local menu photo, returning `{ '/images/menu/x.jpg': url }`. */
async function uploadImages() {
  if (!fs.existsSync(IMAGE_DIR)) {
    console.log(c.dim("  no public/images/menu directory — skipping uploads"));
    return {};
  }
  const files = fs.readdirSync(IMAGE_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const map = {};
  let done = 0, failed = 0;

  for (const file of files) {
    const buf = fs.readFileSync(path.join(IMAGE_DIR, file));
    const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    try {
      const { data, error } = await db.storage
        .from(BUCKET)
        .upload(`menu/${file}`, new Blob([buf], { type }));
      if (error) throw new Error(error.message ?? String(error));
      map[`/images/menu/${file}`] = data.url;
      done++;
      if (done % 20 === 0) console.log(c.dim(`    ${done}/${files.length}...`));
    } catch (err) {
      console.log(c.red(`    failed ${file}: ${err.message}`));
      failed++;
    }
  }
  console.log(`  ${c.green(String(done))} uploaded, ${failed} failed.`);
  return map;
}

/* ------------------------------------------------------------------ *
 * 3. Upsert rows
 * ------------------------------------------------------------------ */

/** Maps a local path to its storage URL, leaving remote URLs untouched. */
const remap = (src, map) => (src ? map[src] ?? src : src);

async function upsert(table, rows, describe) {
  const { data: existing } = await db.database.from(table).select("id, available");
  const known = new Map((existing ?? []).map((r) => [r.id, r.available]));

  let inserted = 0, updated = 0, failed = 0;
  for (const row of rows) {
    // Never resurrect a sold-out item on re-seed.
    const payload = known.has(row.id)
      ? { ...row, available: known.get(row.id) }
      : row;

    const { error } = known.has(row.id)
      ? await db.database.from(table).update(payload).eq("id", row.id)
      : await db.database.from(table).insert([payload]);

    if (error) {
      console.log(c.red(`    ${row.id}: ${error.message ?? JSON.stringify(error)}`));
      failed++;
    } else if (known.has(row.id)) updated++;
    else inserted++;
  }
  console.log(`  ${describe}: ${c.green(String(inserted))} inserted, ${updated} updated, ${failed} failed.`);
  return failed;
}

/* ------------------------------------------------------------------ *
 * 4. Admin user
 * ------------------------------------------------------------------ */

async function ensureAdmin() {
  const { data } = await db.database
    .from("admin_users")
    .select("id")
    .eq("username", "admin")
    .maybeSingle();

  if (data) {
    console.log(c.dim("  admin user already exists — password left unchanged"));
    return;
  }
  const hash = await bcrypt.hash(adminPassword, 10);
  const { error } = await db.database
    .from("admin_users")
    .insert([{ username: "admin", password_hash: hash }]);

  if (error) {
    console.log(c.red(`  admin user failed: ${error.message ?? JSON.stringify(error)}`));
    return;
  }
  console.log(`  ${c.green("admin")} created — username "admin", password from ADMIN_DEFAULT_PASSWORD.`);
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\n${c.bold("SEEDING INSFORGE")}  ${c.dim(baseUrl)}\n`);

  const source = fs.readFileSync(DATA_TS, "utf8");
  const items = parseItems(source);
  const deals = parseDeals(source);
  console.log(`Parsed lib/data.ts: ${items.length} items, ${deals.length} deals.\n`);

  console.log("Uploading images...");
  const urls = await uploadImages();

  console.log("\nWriting rows...");
  const itemRows = items.map((i) => ({
    ...i,
    images: i.images.map((src) => remap(src, urls)),
  }));
  const dealRows = deals.map((d) => ({ ...d, image: remap(d.image, urls) }));

  let failed = 0;
  failed += await upsert("menu_items", itemRows, "menu_items");
  failed += await upsert("deals", dealRows, "deals");

  console.log("\nAdmin user...");
  await ensureAdmin();

  const { count: itemCount } = await db.database
    .from("menu_items")
    .select("id", { count: "exact", head: true });
  const { count: dealCount } = await db.database
    .from("deals")
    .select("id", { count: "exact", head: true });

  console.log(
    `\n${c.bold("DONE")}  menu_items: ${itemCount ?? "?"}, deals: ${dealCount ?? "?"}\n`
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(c.red(`\nSeed failed: ${err.message}\n`));
  process.exit(1);
});
