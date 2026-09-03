import { requireCustomer } from "../_lib/session";
import { insforgeAdmin } from "@/lib/insforge";

type OfferRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  members_only: boolean;
  active: boolean;
  expires_at: string | null;
};

/**
 * GET /api/auth/offers — the caller's offers, split into available and used.
 *
 * The catalogue itself is public (RLS exposes active offers to everyone), but
 * which ones a given customer has spent needs used_offers plus the order each
 * was spent on. The admin client resolves that join because used_offers is
 * readable but orders is scoped — and this is the caller's own history either
 * way, filtered by their customer_id.
 */
export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const db = insforgeAdmin();

  const [offersRes, usedRes] = await Promise.all([
    db.database.from("offers").select("*").eq("active", true).order("created_at"),
    db.database
      .from("used_offers")
      .select("offer_id, order_id, used_at")
      .eq("customer_id", auth.customer.id),
  ]);

  if (offersRes.error) {
    console.error("[auth] offers read failed:", offersRes.error.message);
    return Response.json({ error: "Could not load your offers." }, { status: 503 });
  }

  const all = (offersRes.data ?? []) as OfferRow[];
  const used = (usedRes.data ?? []) as { offer_id: string; order_id: string | null; used_at: string }[];
  const usedByOffer = new Map(used.map((u) => [u.offer_id, u]));

  // Resolve order numbers for the "Used on MC-…" line in one go.
  const orderIds = used.map((u) => u.order_id).filter(Boolean) as string[];
  const orderNumbers = new Map<string, string>();
  if (orderIds.length) {
    const { data: orders } = await db.database
      .from("orders")
      .select("id, order_number")
      .in("id", orderIds);
    for (const o of (orders ?? []) as { id: string; order_number: string }[]) {
      orderNumbers.set(o.id, o.order_number);
    }
  }

  const now = Date.now();
  const available: unknown[] = [];
  const spent: unknown[] = [];

  for (const offer of all) {
    const redemption = usedByOffer.get(offer.id);
    if (redemption) {
      spent.push({
        code: offer.code,
        title: offer.title,
        usedAt: redemption.used_at,
        orderNumber: redemption.order_id ? orderNumbers.get(redemption.order_id) ?? null : null,
      });
      continue;
    }

    // Expired or fully claimed offers are simply not shown as available —
    // there is nothing a customer can do with them.
    if (offer.expires_at && new Date(offer.expires_at).getTime() < now) continue;
    if (offer.max_uses != null && offer.used_count >= offer.max_uses) continue;

    available.push({
      code: offer.code,
      title: offer.title,
      description: offer.description,
      discountType: offer.discount_type,
      discountValue: offer.discount_value,
      minOrder: offer.min_order,
      membersOnly: offer.members_only,
      expiresAt: offer.expires_at,
    });
  }

  return Response.json({ available, used: spent });
}
