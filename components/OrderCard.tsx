"use client";

/**
 * One order in the history: a collapsed summary that expands into the full
 * receipt, with a status tracker across the top.
 */

import { useState } from "react";
import { money } from "@/lib/format";
import OrderStatusPill, { STATUS_FLOW, STEP_LABELS } from "./OrderStatusPill";

export interface OrderLine {
  name: string;
  variant?: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  order_type: "delivery" | "pickup";
  customer_name: string;
  phone: string;
  delivery_address: {
    street?: string;
    area?: string;
    city?: string;
    landmark?: string;
  } | null;
  notes: string | null;
  items: OrderLine[];
  subtotal: number;
  delivery_fee: number;
  discount: number | null;
  total: number;
  payment_method: string | null;
  offer_code: string | null;
  created_at: string;
}

function when(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function orderLines(raw: OrderLine[] | string): OrderLine[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Horizontal progress through the order.
 *
 * A cancelled order does not get a position in the flow — it stopped wherever
 * it stopped, and we do not record where. It is shown as a single red step so
 * the tracker never implies a cancelled order is still progressing.
 */
function StatusTracker({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <ol className="ord-track ord-track--cancelled" aria-label="Order cancelled">
        <li className="ord-step" data-state="cancelled">
          <span className="ord-step__dot" aria-hidden="true">
            ✕
          </span>
          <span className="ord-step__label">Cancelled</span>
        </li>
      </ol>
    );
  }

  const current = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);

  return (
    <ol className="ord-track" aria-label={`Order status: ${STEP_LABELS[status] ?? status}`}>
      {STATUS_FLOW.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={step} className="ord-step" data-state={state}>
            <span className="ord-step__dot" aria-hidden="true" />
            <span className="ord-step__label">{STEP_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderCard({
  order,
  onReorder,
  reordering,
}: {
  order: CustomerOrder;
  onReorder: (order: CustomerOrder) => void;
  reordering: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lines = orderLines(order.items);
  const addr = order.delivery_address;

  const summary =
    lines
      .map((l) => `${l.name}${l.variant ? ` (${l.variant})` : ""} ×${l.quantity}`)
      .join(", ") || "—";

  return (
    <article className="ord" data-open={open}>
      <div className="ord__head">
        <button
          type="button"
          className="ord__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="ord__num">{order.order_number}</span>
          <span className="ord__when">{when(order.created_at)}</span>
          <span className="ord__total">{money(order.total)}</span>
          <OrderStatusPill status={order.status} />
        </button>

        <button
          type="button"
          className="btn btn--sm btn--ghost ord__reorder"
          onClick={() => onReorder(order)}
          disabled={reordering}
        >
          {reordering ? "Adding…" : "Reorder →"}
        </button>
      </div>

      <p className="ord__summary">{summary}</p>

      {open && (
        <div className="ord__body">
          <StatusTracker status={order.status} />

          <div className="ord__tablewrap">
            <table className="ord__table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Variant</th>
                  <th className="tabular">Qty</th>
                  <th className="tabular">Price</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={`${l.name}-${i}`}>
                    <td>{l.name}</td>
                    <td>{l.variant || "—"}</td>
                    <td className="tabular">{l.quantity}</td>
                    <td className="tabular">{money(l.lineTotal ?? l.price * l.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Subtotal</td>
                  <td className="tabular">{money(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3}>Delivery fee</td>
                  <td className="tabular">
                    {order.delivery_fee > 0 ? money(order.delivery_fee) : "Free"}
                  </td>
                </tr>
                {!!order.discount && order.discount > 0 && (
                  <tr className="ord__discount">
                    <td colSpan={3}>
                      Discount{order.offer_code ? ` (${order.offer_code})` : ""}
                    </td>
                    <td className="tabular">−{money(order.discount)}</td>
                  </tr>
                )}
                <tr className="ord__grand">
                  <td colSpan={3}>Total</td>
                  <td className="tabular">{money(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <dl className="ord__meta">
            {order.order_type === "delivery" && addr ? (
              <>
                <dt>Delivery to</dt>
                <dd>
                  {[addr.street, addr.area, addr.city].filter(Boolean).join(", ")}
                  {addr.landmark ? ` — near ${addr.landmark}` : ""}
                </dd>
              </>
            ) : (
              <>
                <dt>Collection</dt>
                <dd>Pickup from the restaurant</dd>
              </>
            )}

            {order.notes && (
              <>
                <dt>Special instructions</dt>
                <dd>{order.notes}</dd>
              </>
            )}

            <dt>Payment</dt>
            <dd>{order.payment_method === "card" ? "Card" : "Cash on Delivery"}</dd>

            {order.offer_code && (
              <>
                <dt>Offer applied</dt>
                <dd>{order.offer_code}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </article>
  );
}
