import { after } from "next/server";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from "@/lib/store";

/**
 * POST /api/orders
 *
 * Takes the checkout form + cart, stamps an order number, and forwards the
 * whole order to the n8n webhook. The webhook is fire-and-forget: it runs
 * after the response is flushed, so a slow or dead n8n never makes a customer
 * wait — and never fails their order.
 */

type OrderType = "delivery" | "pickup";

interface IncomingItem {
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
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MC-${yy}${mm}${dd}-${rand}`;
}

const WEBHOOK_TIMEOUT_MS = 10_000;

export async function POST(request: Request) {
  let body: IncomingOrder;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: "An order needs at least one item." }, { status: 400 });
  }

  const now = new Date();
  const orderNumber = orderNumberFor(now);
  const pickup = body.orderType === "pickup";

  // Money is recomputed here rather than trusted from the browser, so the
  // kitchen always sees totals that match the menu.
  const items = body.items.map((i) => ({
    name: i.name,
    variant: i.variant,
    price: i.price,
    quantity: i.quantity,
    lineTotal: i.price * i.quantity,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryFee = pickup
    ? 0
    : subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_FEE;
  const estimatedMinutes = pickup ? 20 : 40;

  const payload = {
    orderNumber,
    timestamp: now.toISOString(),
    orderType: body.orderType,
    customer: body.customer,
    deliveryAddress: pickup ? null : body.deliveryAddress,
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    paymentMethod: body.paymentMethod,
    specialInstructions: body.specialInstructions,
    estimatedMinutes,
  };

  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(
      `[orders] NEXT_PUBLIC_WEBHOOK_URL is not set — ${orderNumber} was not forwarded to n8n.`
    );
  } else {
    // Runs once the response is on the wire. Nothing below can delay or fail
    // the customer's confirmation.
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
          console.error(
            `[orders] Webhook rejected ${orderNumber}: HTTP ${res.status} ${res.statusText}`
          );
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
