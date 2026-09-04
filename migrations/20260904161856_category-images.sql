-- A picture per category, shown in the homepage "What are you craving?" strip.
--
-- The strip used to render lib/data.ts's CATEGORIES array, images included, so
-- there was no way to change a tile without a code change. Seeding the exact
-- URLs that array already used means the strip looks identical the moment it
-- starts reading from here — this migration changes where the data lives, not
-- what is on screen.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image TEXT;

UPDATE categories SET image = v.image
FROM (VALUES
  ('burgers',      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80'),
  ('shawarma',     'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=80'),
  ('paratha-roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80'),
  ('pizza',        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80'),
  ('fries',        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80'),
  ('appetizers',   'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=900&q=80'),
  ('continental',  'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=900&q=80'),
  ('platters',     'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=80')
) AS v(id, image)
WHERE categories.id = v.id
  AND categories.image IS NULL;

-- 'uncategorized' deliberately keeps a null image: it is an internal bucket for
-- items whose category was deleted, and the storefront never lists it.
