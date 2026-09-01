#!/usr/bin/env node
/**
 * MASTER CHEF — menu import pipeline
 * ============================================================================
 *
 * Usage
 * -----
 *   1. cp incoming/menu-template.csv incoming/menu.csv
 *   2. Fill in one row per item (see incoming/README.md for the columns).
 *   3. Drop the photos into incoming/images/
 *   4. npm run import-menu
 *
 * What it does
 * ------------
 *   - parses incoming/menu.csv with a quote-aware CSV reader
 *   - validates every row and SKIPS bad ones with a clear per-row error
 *   - slugs an id from the name (-2, -3 … on collision)
 *   - optimises photos into public/images/menu/<id>-1.jpg / -2.jpg
 *       · macOS: `sips` (resize to max 1400px, re-encode as JPEG)
 *       · elsewhere: copies the file unchanged and prints a notice
 *   - a missing/unreadable photo falls back to the neutral placeholder
 *   - rewrites lib/generated-items.ts wholesale — idempotent, safe to re-run
 *
 * Zero dependencies: plain Node, no npm install required.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = path.join(ROOT, "incoming", "menu.csv");
const IMAGES_IN = path.join(ROOT, "incoming", "images");
const IMAGES_OUT = path.join(ROOT, "public", "images", "menu");
const OUT_FILE = path.join(ROOT, "lib", "generated-items.ts");

const PLACEHOLDER = "/images/placeholder.svg";

const CATEGORIES = [
  "burgers",
  "shawarma",
  "paratha-roll",
  "fries",
  "appetizers",
  "continental",
  "pizza",
  "platters",
];

const COLUMNS = [
  "name",
  "category",
  "subcategory",
  "variants",
  "description",
  "image1",
  "image2",
  "spicy",
  "featured",
  "isNew",
  "trending",
];

/* --------------------------------------------------------------------- *
 * Console helpers
 * --------------------------------------------------------------------- */

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const warnings = [];
const errors = [];

/* --------------------------------------------------------------------- *
 * CSV parsing (quote-aware, RFC-4180-ish)
 * --------------------------------------------------------------------- */

/** Parse a whole CSV document into an array of string arrays. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  // Normalise line endings so CRLF files from Excel behave.
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // Trailing field / row (file may not end with a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop entirely blank lines.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/* --------------------------------------------------------------------- *
 * Field helpers
 * --------------------------------------------------------------------- */

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function yes(value) {
  return ["yes", "y", "true", "1"].includes(String(value ?? "").trim().toLowerCase());
}

/**
 * "Regular:350|Large:450" -> [{label:"Regular",price:350},…]
 * A bare number ("350") becomes [{label:"Regular",price:350}].
 * Throws with a readable message on anything malformed.
 */
function parseVariants(raw) {
  const value = String(raw ?? "").trim();
  if (!value) throw new Error("variants is required");

  // Bare number shorthand.
  if (/^\d+$/.test(value)) {
    const price = Number(value);
    if (!Number.isInteger(price) || price <= 0)
      throw new Error(`variant price "${value}" must be a positive whole number`);
    return [{ label: "Regular", price }];
  }

  const variants = [];
  for (const part of value.split("|")) {
    const chunk = part.trim();
    if (!chunk) continue;

    const idx = chunk.lastIndexOf(":");
    if (idx === -1)
      throw new Error(
        `variant "${chunk}" must be written as Label:Price (e.g. Regular:350)`
      );

    const label = chunk.slice(0, idx).trim();
    const priceRaw = chunk.slice(idx + 1).trim();

    if (!label) throw new Error(`variant "${chunk}" is missing a label`);
    if (!/^\d+$/.test(priceRaw))
      throw new Error(
        `variant "${chunk}" price must be a positive whole number of rupees`
      );

    const price = Number(priceRaw);
    if (!Number.isInteger(price) || price <= 0)
      throw new Error(`variant "${chunk}" price must be greater than zero`);

    variants.push({ label, price });
  }

  if (variants.length === 0) throw new Error("variants is required");
  return variants;
}

/* --------------------------------------------------------------------- *
 * Image handling
 * --------------------------------------------------------------------- */

let sipsAvailable = null;

/** macOS ships `sips`; everywhere else we copy the original through. */
function hasSips() {
  if (sipsAvailable !== null) return sipsAvailable;
  try {
    execFileSync("sips", ["--version"], { stdio: "ignore" });
    sipsAvailable = true;
  } catch {
    sipsAvailable = false;
  }
  return sipsAvailable;
}

/**
 * Copy/optimise one source photo into public/images/menu/.
 * Returns a public URL, or the placeholder when the file is missing.
 */
function processImage(filename, id, slot) {
  const name = String(filename ?? "").trim();
  if (!name) return null;

  const src = path.join(IMAGES_IN, name);
  if (!fs.existsSync(src)) {
    warnings.push(
      `${id}: image "${name}" not found in incoming/images/ — using placeholder`
    );
    return PLACEHOLDER;
  }

  const ext = path.extname(name).toLowerCase();
  const useSips = hasSips() && [".jpg", ".jpeg", ".png", ".heic", ".tiff", ".webp"].includes(ext);
  const outName = useSips ? `${id}-${slot}.jpg` : `${id}-${slot}${ext || ".jpg"}`;
  const dest = path.join(IMAGES_OUT, outName);

  try {
    if (useSips) {
      // Resize the long edge to 1400px max and re-encode as JPEG.
      execFileSync(
        "sips",
        ["-Z", "1400", "-s", "format", "jpeg", "-s", "formatOptions", "82", src, "--out", dest],
        { stdio: "ignore" }
      );
    } else {
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    warnings.push(`${id}: could not process "${name}" (${err.message}) — using placeholder`);
    return PLACEHOLDER;
  }

  return `/images/menu/${outName}`;
}

/* --------------------------------------------------------------------- *
 * Codegen
 * --------------------------------------------------------------------- */

const q = (s) => JSON.stringify(String(s ?? ""));

function renderItem(item) {
  const flags = ["spicy", "featured", "isNew", "trending"]
    .filter((f) => item[f])
    .map((f) => `    ${f}: true,`)
    .join("\n");

  return `  {
    id: ${q(item.id)},
    name: ${q(item.name)},
    category: ${q(item.category)},
    subcategory: ${q(item.subcategory)},
    variants: [
${item.variants.map((v) => `      { label: ${q(v.label)}, price: ${v.price} },`).join("\n")}
    ],
    description: ${q(item.description)},
    images: [${q(item.images[0])}, ${q(item.images[1])}],
${flags}${flags ? "\n" : ""}  },`;
}

function renderFile(items) {
  const body = items.length
    ? `[\n${items.map(renderItem).join("\n")}\n]`
    : "[]";

  return `/**
 * AUTO-GENERATED by \`npm run import-menu\` — DO NOT EDIT BY HAND.
 * Source: incoming/menu.csv + incoming/images/
 * Every run rewrites this file wholesale.
 *
 * Generated: ${new Date().toISOString()}
 * Items: ${items.length}
 */
import type { MenuItem } from "./data";

export const GENERATED_ITEMS: MenuItem[] = ${body};
`;
}

/* --------------------------------------------------------------------- *
 * Main
 * --------------------------------------------------------------------- */

function main() {
  console.log(c.bold("\nMASTER CHEF — menu import\n"));

  if (!fs.existsSync(CSV_PATH)) {
    console.log(
      c.yellow("No incoming/menu.csv found.") +
        "\n  Copy incoming/menu-template.csv to incoming/menu.csv, fill it in,\n" +
        "  drop your photos into incoming/images/ and run this again.\n"
    );
    // Still emit an empty file so the app always compiles.
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, renderFile([]), "utf8");
    console.log(c.dim(`  Wrote empty ${path.relative(ROOT, OUT_FILE)}\n`));
    return;
  }

  fs.mkdirSync(IMAGES_OUT, { recursive: true });

  const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  if (rows.length === 0) {
    console.log(c.yellow("menu.csv is empty — nothing to import.\n"));
    fs.writeFileSync(OUT_FILE, renderFile([]), "utf8");
    return;
  }

  // Header row: tolerate any column order as long as the names match.
  const header = rows[0].map((h) => h.trim().replace(/^﻿/, ""));
  const looksLikeHeader = header.some((h) => COLUMNS.includes(h));
  const columnIndex = {};
  if (looksLikeHeader) {
    COLUMNS.forEach((col) => {
      columnIndex[col] = header.indexOf(col);
    });
    const missing = ["name", "category", "subcategory", "variants", "image1"].filter(
      (col) => columnIndex[col] === -1
    );
    if (missing.length) {
      console.log(
        c.red(`menu.csv is missing required column(s): ${missing.join(", ")}`) + "\n"
      );
      process.exitCode = 1;
      return;
    }
  } else {
    // No header — assume the documented column order.
    COLUMNS.forEach((col, i) => {
      columnIndex[col] = i;
    });
  }

  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const items = [];
  const usedIds = new Set();

  dataRows.forEach((cells, i) => {
    // +2 so the number matches what a spreadsheet shows (1-based, header row).
    const lineNo = looksLikeHeader ? i + 2 : i + 1;
    const get = (col) => (cells[columnIndex[col]] ?? "").trim();

    const name = get("name");
    const category = get("category").toLowerCase();
    const subcategory = get("subcategory");

    try {
      if (!name) throw new Error("name is required");
      if (!category) throw new Error("category is required");
      if (!CATEGORIES.includes(category))
        throw new Error(
          `category "${category}" is not valid (expected one of: ${CATEGORIES.join(", ")})`
        );
      if (!subcategory) throw new Error("subcategory is required");
      if (!get("image1")) throw new Error("image1 is required");

      const variants = parseVariants(get("variants"));

      // Unique id, with -2/-3 suffixes on collision.
      let id = slugify(name);
      if (!id) throw new Error(`could not build an id from name "${name}"`);
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);

      const image1 = processImage(get("image1"), id, 1) ?? PLACEHOLDER;
      const image2 = processImage(get("image2"), id, 2) ?? image1;

      items.push({
        id,
        name,
        category,
        subcategory,
        variants,
        description:
          get("description") ||
          `${name} — freshly prepared at Master Chef, Peshawar.`,
        images: [image1, image2],
        spicy: yes(get("spicy")),
        featured: yes(get("featured")),
        isNew: yes(get("isNew")),
        trending: yes(get("trending")),
      });
    } catch (err) {
      errors.push(`row ${lineNo}${name ? ` ("${name}")` : ""}: ${err.message}`);
    }
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, renderFile(items), "utf8");

  /* ----------------------------- Report ------------------------------ */

  if (!hasSips() && items.length > 0) {
    console.log(
      c.yellow("Notice: ") +
        "`sips` is unavailable on this platform, so images were copied\n" +
        "        unchanged instead of being resized/re-encoded. Consider\n" +
        "        optimising them before dropping them in incoming/images/.\n"
    );
  }

  for (const w of warnings) console.log(c.yellow("  warn  ") + w);
  for (const e of errors) console.log(c.red("  skip  ") + e);

  if (warnings.length || errors.length) console.log("");

  console.log(
    c.green(`  Imported ${items.length} item${items.length === 1 ? "" : "s"}`) +
      (errors.length ? c.red(`  ·  ${errors.length} row(s) skipped`) : "") +
      (warnings.length ? c.yellow(`  ·  ${warnings.length} warning(s)`) : "")
  );
  console.log(c.dim(`  Wrote ${path.relative(ROOT, OUT_FILE)}`));
  if (items.length) {
    console.log(c.dim(`  Images in ${path.relative(ROOT, IMAGES_OUT)}`));
  }
  console.log("");
}

main();
