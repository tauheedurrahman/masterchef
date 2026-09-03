-- Master Chef — complete database schema
-- Canonical definition of every application table and its RLS.
--
-- NOTE: this file is the *target* shape. It is written with CREATE TABLE IF NOT
-- EXISTS, so running it against a database that already has an older `orders`
-- table is a no-op for that table and will NOT add the newer columns
-- (customer_id, delivery_address, discount, offer_code, loyalty_points_earned).
-- The reconciling migration lives in insforge/migrations/ — apply that, not this
-- file, against an existing database. Keep the two in step.

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('burgers','shawarma','paratha-roll','fries','appetizers','continental','pizza','platters')),
  subcategory TEXT NOT NULL,
  variants JSONB NOT NULL,
  description TEXT,
  images JSONB NOT NULL DEFAULT '[]',
  spicy BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  trending BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  includes JSONB NOT NULL DEFAULT '[]',
  image TEXT,
  midnight BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers (phone is the login identifier, email optional)
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

-- Customer addresses (max 5 enforced app-side)
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

-- Orders (guest or linked to customer)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  order_type TEXT NOT NULL CHECK (order_type IN ('delivery','pickup')),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  delivery_address JSONB,
  notes TEXT,
  items JSONB NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  discount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'cod',
  offer_code TEXT,
  loyalty_points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Saved carts (one per customer, for cart recovery)
CREATE TABLE IF NOT EXISTS saved_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  items JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Offers / promo codes
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

-- Track which customer used which offer
CREATE TABLE IF NOT EXISTS used_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  offer_id UUID REFERENCES offers(id),
  order_id UUID REFERENCES orders(id),
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, offer_id)
);

-- Admin users (separate from customer auth)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_items" ON menu_items FOR SELECT USING (available = true);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_deals" ON deals FOR SELECT USING (available = true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_read" ON customers FOR SELECT USING (auth_id = auth.uid()::text);
CREATE POLICY "own_update" ON customers FOR UPDATE USING (auth_id = auth.uid()::text);
CREATE POLICY "self_insert" ON customers FOR INSERT WITH CHECK (true);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_addresses" ON customer_addresses FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_insert_orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "own_read_orders" ON orders FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

ALTER TABLE saved_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_cart" ON saved_carts FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_offers" ON offers FOR SELECT USING (active = true);

ALTER TABLE used_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_used" ON used_offers FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()::text));

-- Seed offers
INSERT INTO offers (code, title, description, discount_type, discount_value, min_order, members_only) VALUES
  ('WELCOME20', 'Welcome! 20% off first order', '20% discount for new members', 'percentage', 20, 500, true),
  ('FREEDEL', 'Free delivery', 'Free delivery on any order', 'fixed', 100, 0, true),
  ('FAMILY50', 'Rs 50 off family orders', 'Rs 50 off on orders above Rs 1000', 'fixed', 50, 1000, false),
  ('MIDNIGHT10', '10% off midnight deals', '10% discount on midnight deals', 'percentage', 10, 0, true)
ON CONFLICT (code) DO NOTHING;
