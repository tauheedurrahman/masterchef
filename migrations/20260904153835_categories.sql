-- Categories as data, so the admin dashboard can manage them.
--
-- Until now the eight categories existed in three places at once: a CHECK
-- constraint on menu_items, the CategorySlug union in lib/data.ts, and the
-- CATEGORIES array the customer pages render from. This migration makes the
-- database the authority for which categories exist.
--
-- Re-runnable: every statement is IF NOT EXISTS / DROP-then-CREATE.

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seeded with the eight that already exist, display names copied from
-- lib/data.ts so the admin list reads the same as the customer menu, and in
-- the same order the storefront shows them.
INSERT INTO categories (id, display_name, icon, sort_order) VALUES
  ('burgers',      'Burgers',      '🍔', 0),
  ('shawarma',     'Shawarma',     '🌯', 1),
  ('paratha-roll', 'Paratha Roll', '🫓', 2),
  ('pizza',        'Pizza',        '🍕', 3),
  ('fries',        'Fries',        '🍟', 4),
  ('appetizers',   'Appetizers',   '🍗', 5),
  ('continental',  'Continental',  '🍝', 6),
  ('platters',     'Platters',     '🍽️', 7),
  -- Where items land when their category is deleted. Not a real menu section:
  -- the admin can re-file them, and nothing links to it on the storefront.
  ('uncategorized','Uncategorized', NULL, 999)
ON CONFLICT (id) DO NOTHING;

/* ------------------------------------------------------------------ *
 * menu_items.category: CHECK -> foreign key
 * ------------------------------------------------------------------ *
 *
 * The CHECK hard-coded the same eight slugs, so a category created in the
 * table above could never be assigned to an item — Postgres would reject the
 * insert and "Create New Category" would be a dead button.
 *
 * A foreign key is the stricter replacement, not a loosening: an item can
 * still only carry a category that exists, but "exists" now means a row here
 * rather than a literal in DDL. ON UPDATE CASCADE means renaming a slug
 * carries its items with it; ON DELETE is left to the default (RESTRICT) so a
 * category with items cannot be dropped out from under them — the delete
 * route re-files them onto 'uncategorized' first, deliberately and in the
 * open.
 */

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_fkey;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_category_fkey
  FOREIGN KEY (category) REFERENCES categories(id)
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items (category);

/* ------------------------------------------------------------------ *
 * RLS
 * ------------------------------------------------------------------ */

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- The category list is public information — it is the menu's table of
-- contents. Writes are admin-only and go through the admin key, which
-- bypasses RLS, so the storefront roles get no write grant at all.
DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE ON categories FROM anon, authenticated;
