import { after } from "next/server";
import { insforgeAdmin } from "@/lib/insforge";
import { checkOffer } from "@/lib/offers";
import { getAuthedCustomer } from "@/app/api/auth/_lib/session";

/**
 * Delivery pricing, mirrored from lib/store.tsx.
 *
 * They are re-declared rather than imported: lib/store.tsx is a "use client"
 * module, so importing it from a route handler yields client *references*
 * instead of numbers — `subtotal + DELIVERY_FEE` then string-concatenates a
 * function and Postgres rejects the row. Keep these two in step with the
 * cart's values.
 */
const FREE_DELIVERY_THRESHOLD = 1500;
const DELIVERY_FEE = 100;

/** One loyalty point per this many rupees spent. */
const RUPEES_PER_POINT = 100;

/**
 * POST /api/orders
 *
 * Takes the checkout form + cart, prices it against the DATABASE (never the
 * browser's numbers), applies any promo code server-side, stores the order, and
 * forwards it to the n8n webhook.
 *
 * Guests and signed-in customers both come through here. A session, if there is
 * one, is read from the auth cookies rather than from the body — a customer_id
 * in the request could be anyone's.
 *
 * The webhook runs after the response is flushed, so a slow or dead n8n never
 * makes a customer wait — and never fails their order.
 */

type OrderType = "delivery" | "pickup";

interface IncomingItem {
  id?: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
}

interface IncomingOrder {
  orderType: OrderType;
  customer: { name: string; phone: string; email: string };
  deliveryAddress: {
    street: string;
    area: string;
    city: string;
    landmark: string;
  } | null;
  items: IncomingItem[];
  paymentMethod: string;
  specialInstructions: string;
  offerCode?: string | null;
}

/** `MC-YYMMDD-XXXX`, e.g. MC-260901-4821. */
function orderNumberFor(now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `MC-${yy}${mm}${dd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const WEBHOOK_TIMEOUT_MS = 10_000;
const PHONE_RE = /^03\d{2}-?\d{7}$/;

type PricedItem = {
  name: string;
  variant: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

/**
 * Re-prices every line from menu_items / deals. A line whose id and variant
 * match a live row is charged the database price; anything unrecognised is
 * rejected rather than silently trusted.
 */
async function repriceFromDatabase(
  items: IncomingItem[]
): Promise<{ priced: PricedItem[]; rejected: string[] }> {
  const db = insforgeAdmin();
  const ids = [...new Set(items.map((i) => i.id).filter(Boolean))] as string[];

  const [{ data: menuRows }, { data: dealRows }] = await Promise.all([
    ids.length
      ? db.database.from("menu_items").select("id, name, variants").in("id", ids)
      : Promise.resolve({ data: [] as unknown[] }),
    ids.length
      ? db.database.from("deals").select("id, name, price").in("id", ids)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const menu = new Map(
    ((menuRows ?? []) as { id: string; name: string; variants: unknown }[]).map((r) => [
      r.id,
      r,
    ])
  );
  const deals = new Map(
    ((dealRows ?? []) as { id: string; name: string; price: number }[]).map((r) => [r.id, r])
  );

  const priced: PricedItem[] = [];
  const rejected: string[] = [];

  for (const line of items) {
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 0));
    let price: number | null = null;
    let name = line.name;

    const menuRow = line.id ? menu.get(line.id) : undefined;
    const dealRow = line.id ? deals.get(line.id) : undefined;

    if (menuRow) {
      const variants = (
        Array.isArray(menuRow.variants)
          ? menuRow.variants
          : JSON.parse(String(menuRow.variants ?? "[]"))
      ) as { label: string; price: number }[];
      const match = variants.find((v) => v.label === line.variant) ?? variants[0];
      if (match) {
        price = Number(match.price);
        name = menuRow.name;
      }
    } else if (dealRow) {
      price = Number(dealRow.price);
      name = dealRow.name;
    }

    if (price === null || !Number.isFinite(price)) {
      rejected.push(line.id ? `${line.id} (${line.name})` : line.name);
      continue;
    }

    priced.push({ name, variant: line.variant, price, quantity: qty, lineTotal: price * qty });
  }

  return { priced, rejected };
}

export async function POST(request: Request) {
  let body: IncomingOrder;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  /* ----------------------------- validate ----------------------------- */
  const errors: string[] = [];
  const name = body.customer?.name?.trim() ?? "";
  const phone = body.customer?.phone?.trim() ?? "";
  const email = body.customer?.email?.trim() ?? "";
  const orderType: OrderType = body.orderType === "pickup" ? "pickup" : "delivery";

  if (!name) errors.push("Name is required.");
  if (!phone) errors.push("Phone is required.");
  else if (!PHONE_RE.test(phone)) errors.push("Phone must look like 03XX-XXXXXXX.");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push("Email is not valid.");
  if (!Array.isArray(body.items) || body.items.length === 0)
    errors.push("An order needs at least one item.");

  const addr = body.deliveryAddress;
  if (orderType === "delivery") {
    if (!addr?.street?.trim()) errors.push("Street address is required for delivery.");
    if (!addr?.area?.trim()) errors.push("Area is required for delivery.");
    if (!addr?.city?.trim()) errors.push("City is required for delivery.");
  }

  if (errors.length) {
    return Response.json({ error: errors.join(" "), errors }, { status: 400 });
  }

  /* --------------------------- who is ordering ------------------------ */
  // Resolved from cookies, never from the request body. A guest simply comes
  // back as null and the order is stored without a customer_id.
  const auth = await getAuthedCustomer();
  const customerId = auth?.customer.id ?? null;

  /* ------------------------ price from the DB ------------------------- */
  let priced: PricedItem[];
  let rejected: string[];
  try {
    ({ priced, rejected } = await repriceFromDatabase(body.items));
  } catch (err) {
    console.error("[orders] repricing failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Could not price this order. Please try again." }, { status: 503 });
  }

  if (!priced.length) {
    return Response.json(
      { error: "None of these items are on the menu any more.", rejected },
      { status: 400 }
    );
  }

  const pickup = orderType === "pickup";
  const subtotal = priced.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryFee = pickup ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

  /* ----------------------------- the offer ---------------------------- */
  // Re-checked here against the subtotal the server just computed. Whatever
  // the browser was shown is irrelevant — this is what the customer pays.
  const requestedCode = (body.offerCode ?? "").trim();
  let discount = 0;
  let offerCode: string | null = null;
  let offerId: string | null = null;
  let offerUsedCount = 0;

  if (requestedCode) {
    const check = await checkOffer(requestedCode, subtotal, customerId);
    if (!check.ok) {
      // Refuse rather than silently dropping the discount: the customer is
      // looking at a total that included it.
      return Response.json({ error: check.error, code: "OFFER" }, { status: 400 });
    }
    discount = check.discount ?? 0;
    offerCode = check.offer!.code;
    offerId = check.offer!.id;
    offerUsedCount = check.offer!.used_count ?? 0;
  }

  const total = Math.max(0, subtotal + deliveryFee - discount);
  const pointsEarned = customerId ? Math.floor(total / RUPEES_PER_POINT) : 0;
  const estimatedMinutes = pickup ? 20 : 40;

  const now = new Date();
  const orderNumber = orderNumberFor(now);

  const deliveryAddress = pickup
    ? null
    : {
        street: addr?.street?.trim() ?? "",
        area: addr?.area?.trim() ?? "",
        city: addr?.city?.trim() || "Peshawar",
        landmark: addr?.landmark?.trim() || "",
      };

  /* ------------------------------ store ------------------------------- */
  const db = insforgeAdmin();

  const { data: inserted, error: insertError } = await db.database
    .from("orders")
    .insert([
      {
        order_number: orderNumber,
        customer_id: customerId,
        status: "new",
        order_type: orderType,
        customer_name: name,
        phone,
        email: email || null,
        // Both shapes are written on purpose: delivery_address is what the
        // customer's order history reads, the flat columns are what the admin
        // dashboard still renders.
        delivery_address: deliveryAddress,
        address: deliveryAddress?.street ?? null,
        area: deliveryAddress?.area ?? null,
        city: deliveryAddress?.city ?? null,
        landmark: deliveryAddress?.landmark || null,
        notes: body.specialInstructions?.trim() || null,
        items: priced,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        offer_code: offerCode,
        loyalty_points_earned: pointsEarned,
        payment_method: body.paymentMethod === "card" ? "card" : "cod",
      },
    ])
    .select();

  if (insertError) {
    console.error("[orders] insert failed:", insertError.message ?? JSON.stringify(insertError));
    return Response.json(
      { error: "We could not save your order. Please try again." },
      { status: 503 }
    );
  }

  const orderId = ((inserted as { id?: string }[] | null) ?? [])[0]?.id ?? null;

  /* --------------------- loyalty, redemption, cart -------------------- */
  // All of this is bookkeeping around an order that is already saved. It runs
  // with the admin key (RLS keeps customers out of their own loyalty columns),
  // and a failure is logged rather than returned: the food is ordered either
  // way, and failing the request here would invite a duplicate order.
  if (customerId && auth) {
    const c = auth.customer;
    const { error: pointsError } = await db.database
      .from("customers")
      .update({
        loyalty_points: c.loyaltyPoints + pointsEarned,
        total_orders: c.totalOrders + 1,
        total_spent: c.totalSpent + total,
        updated_at: now.toISOString(),
      })
      .eq("id", customerId);

    if (pointsError) {
      console.error(
        `[orders] loyalty update failed for ${orderNumber}:`,
        pointsError.message ?? pointsError
      );
    }

    if (offerId) {
      const { error: usedError } = await db.database
        .from("used_offers")
        .insert([{ customer_id: customerId, offer_id: offerId, order_id: orderId }]);
      if (usedError) {
        console.error(
          `[orders] used_offers insert failed for ${orderNumber}:`,
          usedError.message ?? usedError
        );
      }
    }

    // The saved cart has been checked out, so the backup is emptied too —
    // otherwise the next sign-in would "restore" an order already placed.
    await db.database
      .from("saved_carts")
      .update({ items: [], updated_at: now.toISOString() })
      .eq("customer_id", customerId);
  }

  if (offerId) {
    const { error: countError } = await db.database
      .from("offers")
      .update({ used_count: offerUsedCount + 1 })
      .eq("id", offerId);
    if (countError) {
      console.error(
        `[orders] offer count update failed for ${orderNumber}:`,
        countError.message ?? countError
      );
    }
  }

  /* ----------------------------- webhook ------------------------------ */
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
  const payload = {
    orderNumber,
    timestamp: now.toISOString(),
    orderType,
    customer: { name, phone, email },
    registered: !!customerId,
    deliveryAddress,
    items: priced,
    subtotal,
    deliveryFee,
    discount,
    offerCode,
    total,
    paymentMethod: body.paymentMethod === "card" ? "card" : "cod",
    specialInstructions: body.specialInstructions?.trim() ?? "",
    estimatedMinutes,
  };

  if (!webhookUrl) {
    console.warn(`[orders] NEXT_PUBLIC_WEBHOOK_URL is not set — ${orderNumber} not forwarded.`);
  } else {
    after(async () => {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
        if (!res.ok) {
          console.error(`[orders] Webhook rejected ${orderNumber}: HTTP ${res.status}`);
          return;
        }
        console.log(`[orders] Webhook accepted ${orderNumber}.`);
      } catch (err) {
        console.error(
          `[orders] Webhook failed for ${orderNumber}:`,
          err instanceof Error ? err.message : err
        );
      }
    });
  }

  return Response.json({
    orderNumber,
    estimatedMinutes,
    subtotal,
    deliveryFee,
    discount,
    total,
    pointsEarned,
  });
}
