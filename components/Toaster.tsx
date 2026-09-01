"use client";

import { useCart } from "@/lib/store";
import { CheckIcon, CloseIcon } from "./Icons";

/** Renders the toast queue held in the cart context. Mounted once in the layout. */
export default function Toaster() {
  const { toasts, dismissToast } = useCart();

  if (toasts.length === 0) return null;

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast__tick">
            <CheckIcon size={13} />
          </span>
          <span>{t.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
          >
            <CloseIcon size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
