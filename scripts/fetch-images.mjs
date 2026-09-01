#!/usr/bin/env node
/**
 * fetch-images.mjs — Master Chef menu image fetcher
 * ------------------------------------------------------------------
 * Downloads free-licence food photography for every menu item, in two
 * stages so a human picks the final shots (this is how you avoid the
 * plastic AI-render look — no automatic "first result wins").
 *
 *   STAGE 1   node scripts/fetch-images.mjs
 *             Downloads N candidates per item into
 *             incoming/image-candidates/<id>/ and writes a review.html
 *             contact sheet.
 *
 *   REVIEW    Open incoming/image-candidates/review.html in a browser.
 *             In each item's folder, DELETE the photos you don't want.
 *             Leave the best one or two. Order matters: the first file
 *             alphabetically becomes the primary image, the second
 *             becomes the hover image.
 *
 *   STAGE 2   node scripts/fetch-images.mjs --promote
 *             Copies the survivors into public/images/menu/<id>-1.jpg
 *             and <id>-2.jpg (falls back to -1 if only one remains),
 *             and writes public/images/menu/CREDITS.md.
 *
 * Requires Node 18+ (global fetch). No npm dependencies.
 *
 * SETUP — get a free API key (30 seconds, no card):
 *   Pexels (default, recommended):  https://www.pexels.com/api/
 *     export PEXELS_API_KEY="..."
 *   Unsplash (alternative):         https://unsplash.com/developers
 *     export UNSPLASH_ACCESS_KEY="..."
 *     ...and run with --provider unsplash
 *
 * FLAGS
 *   --provider pexels|unsplash   default: pexels
 *   --candidates <n>             default: 3
 *   --only <id,id,...>           re-fetch just these ids
 *   --promote                    run stage 2
 *   --force                      re-download items that already have candidates
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const CANDIDATE_DIR = path.join(ROOT, 'incoming', 'image-candidates');
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', 'menu');

/**
 * Search queries, tuned per item.
 *
 * These are deliberately NOT the menu names. "Zinger" and "paratha roll"
 * return almost nothing usable on Western stock libraries, so each query
 * describes the dish in terms a stock photographer would have tagged it
 * with. Tweak freely — this map is the whole quality knob of this script.
 *
 * IMPORTANT: if scripts/image-queries.json exists it wins, because that file
 * is generated from the ids actually present in lib/data.ts. The map below is
 * only a fallback for the ids this script was originally written against —
 * if your ids differ, the downloaded filenames won't match your catalogue.
 * Generate the real one with:  node scripts/audit-images.mjs --emit-queries
 */
const QUERIES_FALLBACK = {
  // ---- BURGERS ----
  'big-bun-zinger-burger':        'crispy fried chicken burger sesame bun',
  'zinger-cheese-burger':         'crispy chicken burger melted cheese',
  'zinger-patty-burger':          'double patty chicken burger',
  'double-zinger-burger':         'double stacked fried chicken burger',
  'mc-signature-burger':          'gourmet chicken burger close up',
  'chicken-burger':               'chicken burger',
  'chicken-cheese-burger':        'chicken cheeseburger',
  'chicken-patty-burger':         'chicken patty sandwich',
  'chicken-zinger-burger':        'spicy crispy chicken sandwich',

  // ---- APPETIZERS ----
  'chicken-nuggets':              'chicken nuggets dipping sauce',
  'chicken-bucket-12-pcs':        'fried chicken bucket',
  'hot-wings-10-pcs':             'buffalo chicken wings',
  'hot-shots':                    'crispy fried chicken bites',

  // ---- FRIES ----
  'french-fries':                 'french fries basket',
  'mayo-fries':                   'french fries with mayonnaise',
  'family-fries':                 'large basket of fries sharing',
  'masala-fries':                 'spicy seasoned fries chilli',
  'garlic-mayo-fries':            'garlic aioli fries',
  'loaded-cheese-fries':          'loaded cheese fries',

  // ---- SHAWARMA ----
  'chicken-shawarma':             'chicken shawarma wrap',
  'zinger-shawarma':              'crispy chicken wrap foil',
  'olive-shawarma':               'shawarma wrap olives',
  'chicken-cheese-shawarma':      'cheesy chicken wrap',
  'mc-arabic-roll':               'arabic chicken roll flatbread',
  'mc-arabic-platter':            'shawarma platter rice salad',
  'mc-twister-roll':              'chicken twister wrap',

  // ---- PARATHA ROLL ----
  'chicken-paratha-roll':         'chicken paratha roll pakistani',
  'zinger-paratha-roll':          'crispy chicken flatbread roll',
  'turkish-chicken-roll':         'turkish chicken doner wrap',
  'chicken-cheese-paratha-roll':  'cheesy chicken flatbread roll',

  // ---- CONTINENTAL ----
  'chicken-chowmein':             'chicken chow mein noodles wok',
  'chicken-fried-rice':           'chicken fried rice',
  'chicken-chilli-dry-with-rice': 'chilli chicken with rice',
  'white-sauce-pasta':            'creamy white sauce pasta',
  'red-sauce-penne-pasta':        'penne pasta tomato sauce',
  'lasagne':                      'lasagna slice',
  'drum-sticks':                  'fried chicken drumsticks',

  // ---- PIZZA ----
  'mc-special-pizza':             'supreme pizza whole',
  'calzone-pizza':                'calzone pizza',

  // ---- PLATTERS ----
  'roasted-platter':              'chicken wings and fries platter',

  // ---- DEALS (generic combo shots) ----
  'deal-1':  'two shawarma wraps and drink',
  'deal-2':  'burgers fries and drink combo',
  'deal-3':  'multiple burgers sharing platter',
  'deal-4':  'two burgers and fries',
  'deal-5':  'tall chicken burger with fries',
  'deal-6':  'double decker burger and fries',
  'deal-7':  'shawarma wraps and bottle of cola',
  'deal-8':  'three chicken wraps',
  'deal-9':  'flatbread rolls and fries',
  'deal-10': 'large family meal spread fast food',
  'deal-11': 'boneless fried chicken pieces',
  'midnight-deal-1': 'burgers and large soda bottle night',
  'midnight-deal-2': 'pizza wrap and drink combo',
};

const QUERIES_FILE = path.join(ROOT, 'scripts', 'image-queries.json');
let QUERIES = QUERIES_FALLBACK;

if (fs.existsSync(QUERIES_FILE)) {
  try {
    QUERIES = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
    console.log(`Using scripts/image-queries.json (${Object.keys(QUERIES).length} items).`);
  } catch (err) {
    console.error(`scripts/image-queries.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('No scripts/image-queries.json found — using the built-in fallback map.');
  console.log('If your item ids differ, run: node scripts/audit-images.mjs --emit-queries\n');
}

// ---------------------------------------------------------------------------
// ARGS
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (argv[i + 1] ?? true);
};
const has = (name) => argv.includes(`--${name}`);

const PROVIDER = String(flag('provider', 'pexels')).toLowerCase();
const CANDIDATES = Number(flag('candidates', 3));
const ONLY = flag('only') ? String(flag('only')).split(',').map(s => s.trim()) : null;
const FORCE = has('force');

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const log = {
  info: (m) => console.log(`  ${m}`),
  ok: (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`),
  warn: (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`),
  err: (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`),
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// ---------------------------------------------------------------------------
// PROVIDERS
// ---------------------------------------------------------------------------

/**
 * Each provider returns a normalised array:
 *   [{ url, width, height, credit, link }]
 * We request landscape orientation and skip anything too small — low-res
 * upscaled shots are the other common tell of a fake-looking catalogue.
 */
const providers = {
  async pexels(query, count) {
    const key = process.env.PEXELS_API_KEY;
    if (!key) throw new Error('PEXELS_API_KEY is not set. See the header of this file.');

    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', String(count * 2)); // over-fetch, then filter
    url.searchParams.set('orientation', 'landscape');

    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
    const json = await res.json();

    return (json.photos || [])
      .filter(p => p.width >= 1200)
      .slice(0, count)
      .map(p => ({
        url: p.src.large2x || p.src.large,
        width: p.width,
        height: p.height,
        credit: `${p.photographer} / Pexels`,
        link: p.url,
      }));
  },

  async unsplash(query, count) {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) throw new Error('UNSPLASH_ACCESS_KEY is not set. See the header of this file.');

    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', String(count * 2));
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('content_filter', 'high');

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
    });
    if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
    const json = await res.json();

    return (json.results || [])
      .filter(p => p.width >= 1200)
      .slice(0, count)
      .map(p => ({
        url: `${p.urls.raw}&auto=format&fit=crop&w=1400&q=80`,
        width: p.width,
        height: p.height,
        credit: `${p.user.name} / Unsplash`,
        link: p.links.html,
      }));
  },
};

// ---------------------------------------------------------------------------
// STAGE 1 — FETCH CANDIDATES
// ---------------------------------------------------------------------------

async function fetchCandidates() {
  const fetchFor = providers[PROVIDER];
  if (!fetchFor) {
    log.err(`Unknown provider "${PROVIDER}". Use pexels or unsplash.`);
    process.exit(1);
  }

  ensureDir(CANDIDATE_DIR);

  const ids = Object.keys(QUERIES).filter(id => !ONLY || ONLY.includes(id));
  const manifest = {};
  let downloaded = 0, skipped = 0, failed = 0;

  console.log(`\nFetching up to ${CANDIDATES} candidates for ${ids.length} items via ${PROVIDER}...\n`);

  for (const id of ids) {
    const query = QUERIES[id];
    const dir = path.join(CANDIDATE_DIR, id);

    if (!FORCE && fs.existsSync(dir) && fs.readdirSync(dir).some(f => f.endsWith('.jpg'))) {
      log.info(`${id} — already has candidates, skipping (use --force to redo)`);
      skipped++;
      // still record existing files in the manifest so review.html stays complete
      manifest[id] = { query, files: fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).map(f => ({ file: f })) };
      continue;
    }

    try {
      const results = await fetchFor(query, CANDIDATES);
      if (!results.length) {
        log.warn(`${id} — no results for "${query}". Edit the QUERIES map and re-run with --only ${id}`);
        failed++;
        continue;
      }

      ensureDir(dir);
      const files = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const name = `${String(i + 1).padStart(2, '0')}.jpg`;
        await download(r.url, path.join(dir, name));
        files.push({ file: name, credit: r.credit, link: r.link });
      }

      // keep provenance next to the images for the credits file later
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ query, files }, null, 2));
      manifest[id] = { query, files };
      log.ok(`${id} — ${files.length} candidates`);
      downloaded++;

      await sleep(250); // be polite to the API
    } catch (err) {
      log.err(`${id} — ${err.message}`);
      failed++;
    }
  }

  writeReviewSheet(manifest);

  console.log(`\n${downloaded} fetched, ${skipped} skipped, ${failed} failed.`);
  console.log(`\nNext: open ${path.relative(ROOT, path.join(CANDIDATE_DIR, 'review.html'))} in a browser.`);
  console.log(`Delete the photos you don't want from each folder, keeping 1-2 per item.`);
  console.log(`Then run:  node scripts/fetch-images.mjs --promote\n`);
}

function writeReviewSheet(manifest) {
  const sections = Object.entries(manifest).map(([id, data]) => {
    const imgs = data.files.map(f =>
      `<figure><img src="./${id}/${f.file}" loading="lazy"><figcaption>${f.file}</figcaption></figure>`
    ).join('');
    return `<section><h2>${id}</h2><p class="q">${data.query}</p><div class="row">${imgs}</div></section>`;
  }).join('\n');

  const html = `<!doctype html>
<meta charset="utf-8">
<title>Master Chef — image review</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; background:#12100f; color:#f6efe3; margin:0; padding:32px; }
  h1 { font-size:22px; letter-spacing:.08em; text-transform:uppercase; }
  .hint { color:#a89e93; max-width:60ch; }
  section { border-top:1px solid #2c2724; padding:20px 0; }
  h2 { font-size:15px; letter-spacing:.06em; text-transform:uppercase; margin:0 0 4px; }
  .q { color:#a89e93; font-size:13px; margin:0 0 12px; }
  .row { display:flex; gap:12px; flex-wrap:wrap; }
  figure { margin:0; width:280px; }
  img { width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:6px; display:block; }
  figcaption { color:#a89e93; font-size:12px; margin-top:6px; }
</style>
<h1>Image review</h1>
<p class="hint">Check each row. Delete the files you don't want from
<code>incoming/image-candidates/&lt;id&gt;/</code>, keeping one or two.
The first remaining file becomes the primary image, the second becomes the hover image.
Reject anything that looks AI-generated: impossibly symmetrical stacks, waxy highlights,
melted-looking text on packaging, or hands with the wrong number of fingers.</p>
${sections}`;

  fs.writeFileSync(path.join(CANDIDATE_DIR, 'review.html'), html);
}

// ---------------------------------------------------------------------------
// STAGE 2 — PROMOTE SURVIVORS
// ---------------------------------------------------------------------------

function promote() {
  if (!fs.existsSync(CANDIDATE_DIR)) {
    log.err('No candidates folder. Run stage 1 first.');
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);
  const credits = [];
  let promoted = 0, empty = 0;

  console.log('\nPromoting chosen images...\n');

  for (const id of fs.readdirSync(CANDIDATE_DIR)) {
    const dir = path.join(CANDIDATE_DIR, id);
    if (!fs.statSync(dir).isDirectory()) continue;

    const picks = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
    if (!picks.length) {
      log.warn(`${id} — no images left, skipped`);
      empty++;
      continue;
    }

    // primary, then hover (falls back to the primary when only one survives)
    const primary = picks[0];
    const hover = picks[1] || picks[0];
    fs.copyFileSync(path.join(dir, primary), path.join(OUTPUT_DIR, `${id}-1.jpg`));
    fs.copyFileSync(path.join(dir, hover), path.join(OUTPUT_DIR, `${id}-2.jpg`));

    // carry attribution across for the credits file
    const metaPath = path.join(dir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        for (const name of new Set([primary, hover])) {
          const m = meta.files.find(f => f.file === name);
          if (m?.credit) credits.push(`- **${id}** — ${m.credit}${m.link ? ` (${m.link})` : ''}`);
        }
      } catch { /* meta is optional */ }
    }

    log.ok(`${id} → ${id}-1.jpg, ${id}-2.jpg`);
    promoted++;
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'CREDITS.md'),
    `# Image credits\n\nPhotography sourced under the Pexels / Unsplash licence.\n\n${[...new Set(credits)].sort().join('\n')}\n`
  );

  console.log(`\n${promoted} items promoted, ${empty} empty.`);
  console.log(`Wrote ${path.relative(ROOT, path.join(OUTPUT_DIR, 'CREDITS.md'))}`);
  console.log(`\nNow point lib/data.ts at the local files:`);
  console.log(`  images: ['/images/menu/<id>-1.jpg', '/images/menu/<id>-2.jpg']\n`);
}

// ---------------------------------------------------------------------------

if (has('promote')) promote();
else await fetchCandidates();
