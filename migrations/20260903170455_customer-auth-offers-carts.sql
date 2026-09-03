-- Customer auth, addresses, saved carts and offers.
--
-- Reconciles the live database with schema.sql. menu_items, deals, admin_users
-- and orders already exist from the first backend pass, so this migration only
-- adds what is missing and ALTERs `orders` into its new shape — schema.sql's
-- CREATE TABLE IF NOT EXISTS would silently skip that table and leave the new
-- order columns absent.
--
-- Written to be re-runnable: every statement is IF NOT EXISTS / DROP-then-CREATE.

/* ------------------------------------------------------------------ *
 * 1. Customers
 * ------------------------------------------------------------------ */

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  area TEXT,
  city TEXT DEFAULT 'Peshawar',
  default_address TEXT,
  default_landmark TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  street TEXT NOT NULL,
  area TEXT,
  city TEXT DEFAULT 'Peshawar',
  landmark TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx
  ON customer_addresses (customer_id);

/* ------------------------------------------------------------------ *
 * 2. Offers
 * ------------------------------------------------------------------ */

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage','fixed')),
  discount_value INTEGER NOT NULL,
  min_order INTEGER DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  members_only BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

/* ------------------------------------------------------------------ *
 * 3. Orders — bring the existing table up to the new shape
 * ------------------------------------------------------------------ */

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

-- Fold the legacy flat address columns into delivery_address for rows written
-- before this migration. The old columns are left in place rather than dropped:
-- they still hold the only copy of that data and app/api/orders/route.ts still
-- writes them until the checkout rewrite lands.
UPDATE orders
SET delivery_address = jsonb_strip_nulls(jsonb_build_object(
      'street',   address,
      'area',     area,
      'city',     city,
      'landmark', landmark
    ))
WHERE delivery_address IS NULL
  AND (address IS NOT NULL OR area IS NOT NULL OR landmark IS NOT NULL);

-- The status vocabulary gains 'confirmed'. A CHECK constraint cannot be altered
-- in place, so drop and re-add it.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new','confirmed','preparing','out_for_delivery','delivered','cancelled'));

/* ------------------------------------------------------------------ *
 * 4. Saved carts + used offers  (after orders: used_offers references it)
 * ------------------------------------------------------------------ */

CREATE TABLE IF NOT EXISTS saved_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  items JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS used_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  offer_id UUID REFERENCES offers(id),
  order_id UUID REFERENCES orders(id),
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, offer_id)
);

/* ------------------------------------------------------------------ *
 * 5. Row Level Security
 * ------------------------------------------------------------------ */

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_offers ENABLE ROW LEVEL SECURITY;

-- customers ---------------------------------------------------------
DROP POLICY IF EXISTS "own_read" ON customers;
CREATE POLICY "own_read" ON customers FOR SELECT
  USING (auth_id = auth.uid()::text);

-- WITH CHECK is deliberately added on top of schema.sql's definition. Without
-- it a signed-in customer could UPDATE their own row and rewrite auth_id to
-- another user's id, handing themselves that account.
DROP POLICY IF EXISTS "own_update" ON customers;
CREATE POLICY "own_update" ON customers FOR UPDATE
  USING (auth_id = auth.uid()::text)
  WITH CHECK (auth_id = auth.uid()::text);

DROP POLICY IF EXISTS "self_insert" ON customers;
CREATE POLICY "self_insert" ON customers FOR INSERT WITH CHECK (true);

-- Owning the row is not permission to rewrite the loyalty ledger. Narrow the
-- runtime roles down to the fields a customer may edit about themselves; points
-- and spend totals are maintained server-side with the admin key.
REVOKE UPDATE ON customers FROM anon, authenticated;
GRANT UPDATE (full_name, email, area, city, default_address, default_landmark, updated_at)
  ON customers TO anon, authenticated;

-- customer_addresses ------------------------------------------------
DROP POLICY IF EXISTS "own_addresses" ON customer_addresses;
CREATE POLICY "own_addresses" ON customer_addresses FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

-- orders ------------------------------------------------------------
DROP POLICY IF EXISTS "anyone_insert_orders" ON orders;
CREATE POLICY "anyone_insert_orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "own_read_orders" ON orders;
CREATE POLICY "own_read_orders" ON orders FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

-- saved_carts -------------------------------------------------------
DROP POLICY IF EXISTS "own_cart" ON saved_carts;
CREATE POLICY "own_cart" ON saved_carts FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

-- offers ------------------------------------------------------------
DROP POLICY IF EXISTS "public_read_offers" ON offers;
CREATE POLICY "public_read_offers" ON offers FOR SELECT USING (active = true);

-- A promo catalogue is readable, never writable, by the storefront.
REVOKE INSERT, UPDATE, DELETE ON offers FROM anon, authenticated;

-- used_offers -------------------------------------------------------
DROP POLICY IF EXISTS "own_used" ON used_offers;
CREATE POLICY "own_used" ON used_offers FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

-- Redemptions are recorded server-side after the order is priced. If the
-- storefront could INSERT here it could mark an offer used without ordering,
-- or delete the row to redeem a one-per-customer offer twice.
REVOKE INSERT, UPDATE, DELETE ON used_offers FROM anon, authenticated;

/* ------------------------------------------------------------------ *
 * 6. Seed offers
 * ------------------------------------------------------------------ */

INSERT INTO offers (code, title, description, discount_type, discount_value, min_order, members_only) VALUES
  ('WELCOME20', 'Welcome! 20% off first order', '20% discount for new members', 'percentage', 20, 500, true),
  ('FREEDEL', 'Free delivery', 'Free delivery on any order', 'fixed', 100, 0, true),
  ('FAMILY50', 'Rs 50 off family orders', 'Rs 50 off on orders above Rs 1000', 'fixed', 50, 1000, false),
  ('MIDNIGHT10', '10% off midnight deals', '10% discount on midnight deals', 'percentage', 10, 0, true)
ON CONFLICT (code) DO NOTHING;
