import { after } from "next/server";
import { insforgeAdmin } from "@/lib/insforge";

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

/**
 * POST /api/orders
 *
 * Takes the checkout form + cart, prices it against the DATABASE (never the
 * browser's numbers), stores the order, and forwards it to the n8n webhook.
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
  const total = subtotal + deliveryFee;
  const estimatedMinutes = pickup ? 20 : 40;

  const now = new Date();
  const orderNumber = orderNumberFor(now);

  /* ------------------------------ store ------------------------------- */
  const { error: insertError } = await insforgeAdmin()
    .database.from("orders")
    .insert([
      {
        order_number: orderNumber,
        status: "new",
        order_type: orderType,
        customer_name: name,
        phone,
        email: email || null,
        address: pickup ? null : addr?.street?.trim() ?? null,
        area: pickup ? null : addr?.area?.trim() ?? null,
        city: pickup ? null : addr?.city?.trim() || "Peshawar",
        landmark: pickup ? null : addr?.landmark?.trim() || null,
        notes: body.specialInstructions?.trim() || null,
        items: priced,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: body.paymentMethod === "card" ? "card" : "cod",
      },
    ]);

  if (insertError) {
    console.error("[orders] insert failed:", insertError.message ?? JSON.stringify(insertError));
    return Response.json(
      { error: "We could not save your order. Please try again." },
      { status: 503 }
    );
  }

  /* ----------------------------- webhook ------------------------------ */
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
  const payload = {
    orderNumber,
    timestamp: now.toISOString(),
    orderType,
    customer: { name, phone, email },
    deliveryAddress: pickup
      ? null
      : {
          street: addr?.street?.trim() ?? "",
          area: addr?.area?.trim() ?? "",
          city: addr?.city?.trim() || "Peshawar",
          landmark: addr?.landmark?.trim() ?? "",
        },
    items: priced,
    subtotal,
    deliveryFee,
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

  return Response.json({ orderNumber, estimatedMinutes });
}
