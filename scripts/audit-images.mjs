#!/usr/bin/env node
/**
 * audit-images.mjs — find duplicate and suspect images in the catalogue
 * --------------------------------------------------------------------
 * Reads lib/data.ts (and lib/generated-items.ts if present), pulls out every
 * item's id / name / images, and reports:
 *
 *   - image URLs used by more than one item      <- the "same photo everywhere" bug
 *   - items whose primary and hover image are identical (no hover effect)
 *   - items with a missing or placeholder image
 *   - a coverage summary (unique images vs items)
 *
 * It does NOT check whether a photo actually shows the right food — no script
 * can. That is what the review sheet in fetch-images.mjs is for.
 *
 *   node scripts/audit-images.mjs
 *   node scripts/audit-images.mjs --emit-queries
 *
 * --emit-queries writes scripts/image-queries.json: a map of YOUR real item
 * ids to a search query derived from the item name, ready for fetch-images.mjs.
 * Edit that file by hand for anything the auto-derivation gets wrong, then run
 * the fetcher.
 *
 * Node 18+. No dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCES = [
  path.join(ROOT, 'lib', 'data.ts'),
  path.join(ROOT, 'lib', 'generated-items.ts'),
];

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// PARSE
// ---------------------------------------------------------------------------

/**
 * Deliberately regex-based rather than a real TS parse: we only need id, name
 * and the images array, and the generated file is machine-written so its shape
 * is predictable. Each item's block runs from its `id:` to the next `id:`.
 */
function extractItems(source, file) {
  const idRe = /\bid:\s*['"`]([^'"`]+)['"`]/g;
  const marks = [];
  let m;
  while ((m = idRe.exec(source)) !== null) marks.push({ id: m[1], at: m.index });

  return marks.map((mark, i) => {
    const block = source.slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : source.length);
    const name = block.match(/\bname:\s*['"`]([^'"`]+)['"`]/)?.[1] ?? mark.id;

    // images: [...] — grab the array body, then every quoted string in it
    const arr = block.match(/\bimages?:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
    const images = [...arr.matchAll(/['"`]([^'"`]+)['"`]/g)].map(x => x[1]);

    // deals use a single `image:` string instead of an images array
    const single = block.match(/\bimage:\s*['"`]([^'"`]+)['"`]/)?.[1];
    if (!images.length && single) images.push(single);

    return { id: mark.id, name, images, file: path.basename(file) };
  });
}

function loadAll() {
  const items = [];
  let found = 0;
  for (const file of SOURCES) {
    if (!fs.existsSync(file)) continue;
    found++;
    items.push(...extractItems(fs.readFileSync(file, 'utf8'), file));
  }
  if (!found) {
    console.error(c.red('\nCould not find lib/data.ts. Run this from the project root.\n'));
    process.exit(1);
  }
  return items;
}

// ---------------------------------------------------------------------------
// AUDIT
// ---------------------------------------------------------------------------

function audit(items) {
  console.log(`\n${c.bold('IMAGE AUDIT')}  ${c.dim(`${items.length} items`)}\n`);

  // --- duplicates across items -------------------------------------------
  const byUrl = new Map();
  for (const it of items) {
    for (const url of new Set(it.images)) {          // ignore self-repeats here
      if (!byUrl.has(url)) byUrl.set(url, []);
      byUrl.get(url).push(it);
    }
  }

  const shared = [...byUrl.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (shared.length) {
    console.log(c.red(`✗ ${shared.length} image(s) reused across multiple items:\n`));
    for (const [url, list] of shared) {
      console.log(`  ${c.dim(shorten(url))}`);
      console.log(`    used by ${c.yellow(String(list.length))}: ${list.map(i => i.id).join(', ')}\n`);
    }
  } else {
    console.log(c.green('✓ No image is shared between items.\n'));
  }

  // --- primary === hover --------------------------------------------------
  const noHover = items.filter(i => i.images.length >= 2 && i.images[0] === i.images[1]);
  if (noHover.length) {
    console.log(c.yellow(`! ${noHover.length} item(s) have the same primary and hover image (hover swap will look broken):`));
    console.log(`  ${noHover.map(i => i.id).join(', ')}\n`);
  }

  // --- missing / placeholder ---------------------------------------------
  const bad = items.filter(i =>
    i.images.length === 0 ||
    i.images.some(u => !u || /placeholder|via\.placeholder|example\.com/i.test(u))
  );
  if (bad.length) {
    console.log(c.red(`✗ ${bad.length} item(s) missing a real image:`));
    console.log(`  ${bad.map(i => i.id).join(', ')}\n`);
  }

  // --- summary ------------------------------------------------------------
  const unique = byUrl.size;
  const ideal = items.length * 2;
  const pct = ideal ? Math.round((unique / ideal) * 100) : 0;
  console.log(c.bold('SUMMARY'));
  console.log(`  items:           ${items.length}`);
  console.log(`  unique images:   ${unique}  ${c.dim(`(${pct}% of the ${ideal} you'd have with 2 unique per item)`)}`);
  console.log(`  reused images:   ${shared.length}`);
  console.log(`  broken/missing:  ${bad.length}\n`);

  if (shared.length || bad.length) {
    console.log(`Next: ${c.bold('node scripts/audit-images.mjs --emit-queries')}`);
    console.log(`then fetch real photos with scripts/fetch-images.mjs\n`);
  }
}

const shorten = (u) => (u.length > 74 ? `${u.slice(0, 71)}...` : u);

// ---------------------------------------------------------------------------
// QUERY GENERATION
// ---------------------------------------------------------------------------

/**
 * Turns a menu name into something a stock photo library will actually match.
 * Brand words and local terms are the problem: "MC Zinger" returns nothing,
 * "crispy fried chicken" returns thousands. Order matters — longer phrases
 * are replaced first.
 */
const REWRITES = [
  [/\bmc\b|\bmaster chef\b/gi, ''],
  [/\bbig bun\b/gi, ''],
  [/\bzinger\b/gi, 'crispy fried chicken'],
  [/\bparatha roll\b/gi, 'flatbread wrap'],
  [/\bpatty\b/gi, ''],
  [/\breg\.?\b/gi, ''],
  [/\bch\.\b/gi, 'chicken'],
  [/\bdrum sticks?\b/gi, 'fried chicken drumsticks'],
  [/\bhot shots?\b/gi, 'crispy fried chicken bites'],
  [/\bchowmein\b|\bchowmin\b/gi, 'chow mein noodles'],
  [/\bpenny pasta\b/gi, 'penne pasta'],
  [/\blasagnes?\b|\blasagne\b/gi, 'lasagna'],
  [/\bdeal ?\d+\b/gi, 'fast food combo meal'],
  [/\(\d+\s*pcs?\)/gi, ''],
  [/\btwister\b/gi, 'chicken wrap'],
  [/\barabic\b/gi, 'middle eastern'],
];

function toQuery(name) {
  let q = name;
  for (const [re, to] of REWRITES) q = q.replace(re, to);
  q = q.replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  // collapse accidental repeats like "chicken chicken"
  q = q.split(' ').filter((w, i, a) => w !== a[i - 1]).join(' ');
  return q || name.toLowerCase();
}

function emitQueries(items) {
  const map = {};
  for (const it of items) map[it.id] = toQuery(it.name);

  const out = path.join(ROOT, 'scripts', 'image-queries.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(map, null, 2));

  console.log(`\nWrote ${c.bold(path.relative(ROOT, out))} — ${Object.keys(map).length} queries.\n`);
  console.log('Sample:');
  for (const [id, q] of Object.entries(map).slice(0, 8)) {
    console.log(`  ${id.padEnd(30)} ${c.dim('→')} ${q}`);
  }
  console.log(`\n${c.yellow('Review this file before fetching.')} Auto-derivation is a starting point,`);
  console.log(`not a finished answer — fix anything that reads oddly, then run the fetcher.\n`);
}

// ---------------------------------------------------------------------------

const items = loadAll();
if (process.argv.includes('--emit-queries')) emitQueries(items);
else audit(items);
