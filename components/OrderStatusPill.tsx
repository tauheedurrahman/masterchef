/**
 * Order status as a coloured pill. Shared by the profile summary and the
 * order history, so a status always reads the same wherever it appears.
 */

export const STATUS_FLOW = [
  "new",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Short labels for the stepper, where horizontal space is tight. */
export const STEP_LABELS: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "On Way",
  delivered: "Delivered",
};

export default function OrderStatusPill({ status }: { status: string }) {
  return (
    <span className="ord-pill" data-s={status}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
