import { requireCustomer } from "../_lib/session";

/**
 * The saved cart is a convenience backup of localStorage, nothing more.
 *
 * Prices are NOT trusted from here — they are whatever the browser last held,
 * and checkout re-prices every line from menu_items anyway. This exists so a
 * customer who switches device or clears a tab does not lose their basket.
 */

interface SavedLine {
  key: string;
  id: string;
  kind: string;
  name: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  image: string;
}

const MAX_LINES = 60;

function sanitise(raw: unknown): SavedLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .slice(0, MAX_LINES)
    .map((l) => ({
      key: String(l.key ?? ""),
      id: String(l.id ?? ""),
      kind: l.kind === "deal" ? "deal" : "item",
      name: String(l.name ?? "").slice(0, 120),
      variantLabel: String(l.variantLabel ?? "").slice(0, 60),
      unitPrice: Number(l.unitPrice) || 0,
      qty: Math.min(99, Math.max(1, Math.floor(Number(l.qty) || 1))),
      image: String(l.image ?? "").slice(0, 500),
    }))
    .filter((l) => l.id && l.key);
}

/** GET /api/auth/cart */
export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.auth.db.database
    .from("saved_carts")
    .select("items, updated_at")
    .eq("customer_id", guard.auth.customer.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] cart read failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not load your cart." }, { status: 503 });
  }

  const row = data as { items: unknown; updated_at: string } | null;
  return Response.json({
    items: row ? sanitise(row.items) : [],
    updatedAt: row?.updated_at ?? null,
  });
}

/**
 * POST /api/auth/cart — replace the saved cart.
 *
 * One row per customer (saved_carts.customer_id is UNIQUE), so this is an
 * update-then-insert rather than an append.
 */
export async function POST(request: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const items = sanitise(body.items);
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await auth.db.database
    .from("saved_carts")
    .update({ items, updated_at: now })
    .eq("customer_id", auth.customer.id)
    .select();

  if (updateError) {
    console.error("[auth] cart save failed:", updateError.message ?? JSON.stringify(updateError));
    return Response.json({ error: "Could not save your cart." }, { status: 503 });
  }

  if (!updated || (updated as unknown[]).length === 0) {
    const { error: insertError } = await auth.db.database
      .from("saved_carts")
      .insert([{ customer_id: auth.customer.id, items, updated_at: now }]);

    if (insertError) {
      console.error(
        "[auth] cart insert failed:",
        insertError.message ?? JSON.stringify(insertError)
      );
      return Response.json({ error: "Could not save your cart." }, { status: 503 });
    }
  }

  return Response.json({ ok: true, count: items.length });
}
