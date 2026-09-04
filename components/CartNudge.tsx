"use client";

/**
 * "You left items in your cart" banner for the homepage.
 *
 * Deliberately a banner and not a popup: it sits in the page flow, is dismissed
 * with one tap, and stays dismissed for the rest of the session.
 *
 * The window is narrow on purpose. Under an hour the customer is probably still
 * shopping and does not need reminding; over a day the basket is stale and the
 * prices may have moved. And if they have ordered since the cart was saved,
 * there is nothing abandoned about it.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { CloseIcon } from "./Icons";

const HOUR = 60 * 60 * 1000;
const MIN_AGE = HOUR;
const MAX_AGE = 24 * HOUR;
const DISMISS_KEY = "masterchef.cartnudge.dismissed";

export default function CartNudge() {
  const { customer, loading } = useAuth();
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (loading || !customer) return;

    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* storage blocked — just show it */
    }

    let cancelled = false;

    (async () => {
      try {
        const [cartRes, ordersRes] = await Promise.all([
          fetch("/api/auth/cart", { cache: "no-store" }),
          fetch("/api/auth/orders?page=0", { cache: "no-store" }),
        ]);
        if (!cartRes.ok || cancelled) return;

        const cart = (await cartRes.json()) as {
          items: { qty: number }[];
          updatedAt: string | null;
        };
        if (!cart.items?.length || !cart.updatedAt) return;

        const age = Date.now() - new Date(cart.updatedAt).getTime();
        if (!Number.isFinite(age) || age < MIN_AGE || age > MAX_AGE) return;

        // An order placed after the cart was saved means it was checked out,
        // not abandoned.
        if (ordersRes.ok) {
          const { orders } = (await ordersRes.json()) as { orders: { created_at: string }[] };
          const last = orders?.[0]?.created_at;
          if (last && new Date(last).getTime() > new Date(cart.updatedAt).getTime()) return;
        }

        if (cancelled) return;
        setCount(cart.items.reduce((n, l) => n + (Number(l.qty) || 0), 0));
        setShow(true);
      } catch {
        /* the banner is a nicety — never surface its failures */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customer, loading]);

  if (!show) return null;

  function dismiss() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* nothing to do */
    }
    setShow(false);
  }

  return (
    <div className="section section--tight">
      <div className="container">
        <div className="nudge nudge--cart" role="status">
          <p>
            🛒 You left {count} item{count === 1 ? "" : "s"} in your cart!
          </p>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/cart" className="btn btn--sm">
              View Cart →
            </Link>
            <button
              type="button"
              className="nudge__x"
              onClick={dismiss}
              aria-label="Dismiss this reminder"
            >
              <CloseIcon size={16} />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
