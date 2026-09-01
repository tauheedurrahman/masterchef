# Adding items to the Master Chef menu

Everything in this folder is **input**. Nothing here is served to visitors — the
import script reads it, optimises your photos into `public/images/menu/` and
regenerates `lib/generated-items.ts`.

## The three-step workflow

1. **Copy the template**

   ```bash
   cp incoming/menu-template.csv incoming/menu.csv
   ```

2. **Fill in one row per item** and **drop your photos into `incoming/images/`**
   (just the filenames go in the CSV — no paths).

3. **Run the import**

   ```bash
   npm run import-menu
   ```

Re-run it as many times as you like. Every run rewrites
`lib/generated-items.ts` from scratch, so the CSV is always the truth.

---

## Column reference

Columns must be named exactly as below. Order does not matter as long as the
header row is present.

| Column        | Required | Format                              | Notes |
|---------------|----------|-------------------------------------|-------|
| `name`        | **yes**  | free text                           | Also becomes the item id (`Zinger Burger` → `zinger-burger`). Duplicates get `-2`, `-3`… |
| `category`    | **yes**  | one slug (see below)                | Anything else and the row is skipped. |
| `subcategory` | **yes**  | free text                           | e.g. `Zinger`, `Chicken`, `Rolls`, `Rice`, `Pasta`. Filter pills on the category page are built from whatever you use here. |
| `variants`    | **yes**  | `Label:Price\|Label:Price`          | e.g. `Regular:350\|Large:450\|Family:700`. A bare number (`350`) becomes `Regular:350`. Prices are whole rupees. |
| `description` | no       | free text                           | One appetising line. Auto-generated if left blank. |
| `image1`      | **yes**  | filename in `incoming/images/`      | The primary photo. |
| `image2`      | no       | filename in `incoming/images/`      | Shown on card hover. Falls back to `image1`. |
| `spicy`       | no       | `yes` / `no`                        | Defaults to `no`. |
| `featured`    | no       | `yes` / `no`                        | Surfaces the item in **Bestsellers** on the homepage. |
| `isNew`       | no       | `yes` / `no`                        | Surfaces it under **New on the menu**. |
| `trending`    | no       | `yes` / `no`                        | Surfaces it under **Trending**. |

### Valid `category` values

```
burgers   shawarma   paratha-roll   fries
appetizers   continental   pizza   platters
```

### Fields with commas

Wrap them in double quotes, the normal CSV way:

```csv
Loaded Fries,fries,Loaded,Regular:450,"Fries with cheese, chicken and jalapeños",lf-1.jpg,,yes,no,no,no
```

---

## What the script does with your photos

| Platform | Behaviour |
|----------|-----------|
| macOS    | Uses the built-in `sips` to resize the long edge to **1400px** and re-encode as JPEG at quality 82. |
| Windows / Linux | `sips` does not exist, so files are **copied unchanged** and the script prints a notice. Optimise them yourself first if they are large. |

Output lands in `public/images/menu/<id>-1.jpg` and `<id>-2.jpg`.

A filename that is not in `incoming/images/` does **not** fail the row — the
item is imported with the neutral house placeholder and a warning is printed.

---

## Reading the output

```
  warn  crispy-fried-wings: image "wings-2.jpg" not found in incoming/images/ — using placeholder
  skip  row 5 ("Mystery Item"): category "snacks" is not valid (expected one of: burgers, …)

  Imported 3 items  ·  1 row(s) skipped  ·  1 warning(s)
```

Skipped rows are never partially imported — fix the row and re-run.

---

## Where the items end up

`lib/generated-items.ts` exports `GENERATED_ITEMS`, which `lib/data.ts` merges
with the hand-curated demo menu:

```ts
export const MENU_ITEMS: MenuItem[] = [...BASE_ITEMS, ...GENERATED_ITEMS];
```

To ship **only** your own listings, change that one line to:

```ts
export const MENU_ITEMS: MenuItem[] = [...GENERATED_ITEMS];
```
