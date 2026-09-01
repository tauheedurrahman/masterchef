# PROMPT — Fix the menu images (paste this whole thing into Claude Code)

Fix the images on my Master Chef site. Right now items show photos of the wrong
food (fries cards show pizza) and one photo is reused across many items. The
website code itself is fine — only the image URLs in the catalogue are wrong.

Two scripts are already in `scripts/`: `audit-images.mjs` and `fetch-images.mjs`.
Read both files before starting. Do not modify either script.

---

## PRECONDITIONS — check these first, stop if any fail

1. `node -v` is 18 or higher.
2. `scripts/audit-images.mjs` and `scripts/fetch-images.mjs` both exist.
3. A `.env` file exists in the project root containing `PEXELS_API_KEY=...`.
   If it does not, stop and tell me — I need to create it myself from
   https://www.pexels.com/api/. Do not try to work around a missing key.
4. `git status` is clean. If it is dirty, list what is uncommitted and stop.
   If clean, run: `git commit -m "checkpoint before image fix" --allow-empty`

---

## PHASE 1 — audit and prepare queries (no downloads yet)

1. Run `node scripts/audit-images.mjs` and show me the full output.

2. Run `node scripts/audit-images.mjs --emit-queries --gaps-only`.
   This writes `scripts/image-queries.json`, mapping each broken item id to a
   search query.

3. **Improve the queries yourself before fetching.** The auto-derived ones are
   crude. Open `scripts/image-queries.json` and rewrite each query so a stock
   photo library will actually return the right dish. Rules:
   - Describe the food, not our brand names. Stock libraries have no idea what
     "MC Zinger" or "Big Bun" means.
   - Local terms need translating: a paratha roll is a "flatbread chicken wrap",
     a zinger is "crispy fried chicken", shawarma is fine as "chicken shawarma wrap".
   - Keep queries 2–5 words. Longer queries return fewer and worse results.
   - Every query must be **distinct**. If two items would search the same thing,
     differentiate them (e.g. "chicken burger" vs "chicken cheeseburger with
     melted cheese") — identical queries are how we ended up with one photo
     everywhere.
   Show me the before/after list of every query you changed.

---

## PHASE 2 — download candidates, then STOP

4. Run `node --env-file=.env scripts/fetch-images.mjs`.
   This downloads 3 candidates per item into `incoming/image-candidates/<id>/`
   and writes `incoming/image-candidates/review.html`.

5. If any item fails or returns no results, fix that item's query in
   `scripts/image-queries.json` and re-run only that one:
   `node --env-file=.env scripts/fetch-images.mjs --only <id> --force`
   Repeat until every item has candidates.

6. **STOP HERE AND WAIT FOR ME.**
   Tell me to open `incoming/image-candidates/review.html` in my browser, and
   tell me exactly how many items are waiting for review. Then stop.

   Do not choose photos yourself. You cannot see whether a photo shows fries or
   pizza, and guessing is the exact bug we are fixing. I will delete the ones I
   do not want and reply when I am done.

---

## PHASE 3 — only after I say I have finished reviewing

7. Run `node --env-file=.env scripts/fetch-images.mjs --promote`.
   This copies my chosen photos to `public/images/menu/<id>-1.jpg` and
   `<id>-2.jpg`, and writes a CREDITS.md.

8. Update `lib/data.ts`. For **every item that now has files in
   `public/images/menu/`**, replace its image values with the local paths:
   ```
   images: ['/images/menu/<id>-1.jpg', '/images/menu/<id>-2.jpg']
   ```
   For deals, which use a single `image:` field, use `<id>-1.jpg`.
   Leave every item that did not get new photos exactly as it is.
   Change nothing else in the file — not descriptions, not prices, not
   variants, not flags, not ordering.

9. Verify, and show me the output of each:
   - `node scripts/audit-images.mjs` — "reused images" must be **0** and
     "broken/missing" must be **0**. If not, tell me which items are still
     wrong instead of trying to patch it yourself.
   - `npm run build` — must succeed with no type errors.
   - Start the production server on a free port, confirm HTTP 200 for `/`,
     `/menu`, one category page, and one file under `/images/menu/`.
     Stop the server afterward.

10. Clean up: delete the `incoming/image-candidates/` folder.

---

## REPORT

- How many items were broken before, how many are fixed now.
- Every query you rewrote, before and after.
- Any item you could not find a decent photo for.
- The final audit numbers.

---

## GUARDRAILS

The only files you may change:
- `scripts/image-queries.json`
- `public/images/menu/` (via the promote script)
- the `images:` / `image:` lines in `lib/data.ts`
- `incoming/image-candidates/` (created and then deleted)

Do not touch any component, route, stylesheet, config, or the two scripts.
Do not install npm packages. Do not refactor, rename, or "improve" anything you
notice along the way — if you spot a bug, put it in the report and leave it
alone. If you are unsure about anything, stop and ask me rather than guessing.
