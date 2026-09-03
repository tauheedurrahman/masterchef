import { requireCustomer } from "../_lib/session";
import { checkOffer } from "@/lib/offers";

/**
 * POST /api/auth/validate-offer
 *
 * Previews a promo code for the APPLY button. It does not reserve or consume
 * anything — the redemption is recorded when the order is actually placed, by
 * /api/orders, which re-runs this same check against its own re-priced
 * subtotal. So a code that passes here can still be refused at checkout if the
 * basket changed in between, which is the correct order of authority.
 *
 * The subtotal is taken from the request only to answer "does this meet the
 * minimum" — it never determines what the customer is charged.
 */
export async function POST(request: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  let body: { code?: string; subtotal?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const subtotal = Math.max(0, Math.floor(Number(body.subtotal) || 0));
  const result = await checkOffer(body.code ?? "", subtotal, guard.auth.customer.id);

  if (!result.ok) {
    return Response.json({ valid: false, error: result.error }, { status: 200 });
  }

  return Response.json({
    valid: true,
    code: result.offer!.code,
    title: result.offer!.title,
    discountType: result.offer!.discount_type,
    discountValue: result.offer!.discount_value,
    discount: result.discount,
  });
}
