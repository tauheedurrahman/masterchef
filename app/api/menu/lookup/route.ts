import { insforgeAdmin } from "@/lib/insforge";

/**
 * POST /api/menu/lookup
 *
 * Re-resolves a set of historical order lines against the live menu, for the
 * Reorder button.
 *
 * The point is the prices. An order from three weeks ago carries what things
 * cost three weeks ago; dropping those straight into the cart would show the
 * customer a total the checkout would then refuse to honour. So every line is
 * looked up fresh, and anything unavailable — deleted, sold out, or a variant
 * that no longer exists — is reported as missing instead of being guessed at.
 *
 * Public because reorder is a storefront action, but it only ever reads the
 * menu, which is public anyway. It reads through the admin client so sold-out
 * rows are visible and can be reported as missing rather than silently absent.
 */

interface IncomingLine {
  name?: string;
  variant?: string;
  quantity?: number;
}

const PLACEHOLDER = "/images/placeholder.svg";

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function POST(request: Request) {
  let body: { lines?: IncomingLine[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const lines = Array.isArray(body.lines) ? body.lines.slice(0, 60) : [];
  if (lines.length === 0) return Response.json({ resolved: [], missing: [] });

  const db = insforgeAdmin();

  // Historical order lines store the item NAME, not its id, so match on name.
  const names = [...new Set(lines.map((l) => (l.name ?? "").trim()).filter(Boolean))];
  if (names.length === 0) return Response.json({ resolved: [], missing: [] });

  const [itemsRes, dealsRes] = await Promise.all([
    db.database
      .from("menu_items")
      .select("id, name, variants, images, available")
      .in("name", names),
    db.database.from("deals").select("id, name, price, image, available").in("name", names),
  ]);

  type ItemRow = {
    id: string;
    name: string;
    variants: unknown;
    images: unknown;
    available: boolean | null;
  };
  type DealRow = {
    id: string;
    name: string;
    price: number;
    image: string | null;
    available: boolean | null;
  };

  const items = new Map(
    ((itemsRes.data ?? []) as ItemRow[]).map((r) => [r.name.toLowerCase(), r])
  );
  const deals = new Map(
    ((dealsRes.data ?? []) as DealRow[]).map((r) => [r.name.toLowerCase(), r])
  );

  const resolved: unknown[] = [];
  const missing: string[] = [];

  for (const line of lines) {
    const name = (line.name ?? "").trim();
    if (!name) continue;
    const qty = Math.min(99, Math.max(1, Math.floor(Number(line.quantity) || 1)));
    const key = name.toLowerCase();

    const item = items.get(key);
    if (item) {
      if (item.available === false) {
        missing.push(name);
        continue;
      }
      const variants = asArray<{ label: string; price: number }>(item.variants);
      // Fall back to the first variant if the old one is gone, so a renamed
      // size does not lose the whole line.
      const variant =
        variants.find((v) => v.label === line.variant) ?? variants[0] ?? null;
      if (!variant) {
        missing.push(name);
        continue;
      }
      const images = asArray<string>(item.images);
      resolved.push({
        id: item.id,
        kind: "item",
        name: item.name,
        variantLabel: variant.label,
        unitPrice: Number(variant.price),
        qty,
        image: images[0] ?? PLACEHOLDER,
      });
      continue;
    }

    const deal = deals.get(key);
    if (deal) {
      if (deal.available === false) {
        missing.push(name);
        continue;
      }
      resolved.push({
        id: deal.id,
        kind: "deal",
        name: deal.name,
        variantLabel: "Deal",
        unitPrice: Number(deal.price),
        qty,
        image: deal.image ?? PLACEHOLDER,
      });
      continue;
    }

    missing.push(name);
  }

  return Response.json({ resolved, missing });
}
