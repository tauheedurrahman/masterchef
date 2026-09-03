"use client";

/** Small shared pieces for the admin screens. */

export interface OrderLine {
  name: string;
  variant?: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  order_type: "delivery" | "pickup";
  customer_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  landmark: string | null;
  notes: string | null;
  items: OrderLine[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  created_at: string;
}

export const STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="adm__pill" data-s={status}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** "4 min ago" / "2 h ago" / "3 d ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** Parses the JSONB items column, which can arrive as an array or a string. */
export function orderLines(raw: OrderRow["items"] | string): OrderLine[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
