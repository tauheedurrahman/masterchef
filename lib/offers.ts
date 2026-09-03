/**
 * Promo code rules — server-only.
 *
 * Both /api/auth/validate-offer (the APPLY button) and /api/orders (placing the
 * order) run this exact function. That is the point of it being here: if the
 * two ever computed the discount separately they would eventually disagree, and
 * a customer would be shown one total and charged another.
 *
 * Nothing in here trusts the client. The code is looked up fresh, the subtotal
 * is the one the server just re-priced from menu_items, and eligibility is
 * checked against used_offers rather than anything the browser said.
 */

import { insforgeAdmin } from "./insforge";

export interface OfferRow {
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
}

export interface OfferCheck {
  ok: boolean;
  /** Customer-facing reason when ok is false. */
  error?: string;
  offer?: OfferRow;
  /** Rupees off, already clamped to the subtotal. */
  discount?: number;
}

/**
 * Rupees off `subtotal` for this offer.
 *
 * Clamped so a fixed discount larger than the basket cannot drive the total
 * negative — FREEDEL is Rs 100 off, and a Rs 60 basket must not end up at -40.
 * Percentages are rounded down, so rounding always favours the shop by at most
 * a rupee rather than the other way.
 */
export function discountFor(offer: OfferRow, subtotal: number): number {
  const raw =
    offer.discount_type === "percentage"
      ? Math.floor((subtotal * offer.discount_value) / 100)
      : offer.discount_value;
  return Math.max(0, Math.min(raw, subtotal));
}

/**
 * Validates a code for a customer and a subtotal.
 *
 * `customerId` null means a guest. Guests fail members_only codes but may use
 * open ones.
 */
export async function checkOffer(
  code: string,
  subtotal: number,
  customerId: string | null
): Promise<OfferCheck> {
  const normalised = (code ?? "").trim().toUpperCase();
  if (!normalised) return { ok: false, error: "Enter a promo code." };

  const db = insforgeAdmin();

  const { data, error } = await db.database
    .from("offers")
    .select("*")
    .eq("code", normalised)
    .maybeSingle();

  if (error) {
    console.error("[offers] lookup failed:", error.message ?? JSON.stringify(error));
    return { ok: false, error: "Could not check that code. Please try again." };
  }
  // Same message for "no such code" and "switched off", so the endpoint cannot
  // be used to enumerate which codes exist.
  if (!data) return { ok: false, error: "That code is not valid." };

  const offer = data as OfferRow;
  if (!offer.active) return { ok: false, error: "That code is not valid." };

  if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "That code has expired." };
  }

  if (offer.max_uses != null && offer.used_count >= offer.max_uses) {
    return { ok: false, error: "That code has been fully claimed." };
  }

  if (offer.members_only && !customerId) {
    return { ok: false, error: "Sign in to use this code.", offer };
  }

  if (subtotal < offer.min_order) {
    const short = offer.min_order - subtotal;
    return {
      ok: false,
      error: `Spend Rs ${short.toLocaleString("en-PK")} more to use this code (minimum Rs ${offer.min_order.toLocaleString("en-PK")}).`,
      offer,
    };
  }

  if (customerId) {
    const { data: used } = await db.database
      .from("used_offers")
      .select("id")
      .eq("customer_id", customerId)
      .eq("offer_id", offer.id)
      .maybeSingle();

    if (used) return { ok: false, error: "You have already used this code.", offer };
  }

  return { ok: true, offer, discount: discountFor(offer, subtotal) };
}
