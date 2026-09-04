"use client";

/**
 * /profile/orders — order history, newest first, 10 at a time.
 *
 * Reorder rebuilds the basket from the order's own lines but re-checks each
 * item against the live menu first: prices change and things get taken off, so
 * copying an old order verbatim would put stale prices in the cart. Anything
 * that is gone or sold out is skipped and reported.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import OrderCard, { orderLines, type CustomerOrder } from "@/components/OrderCard";
import { useCart } from "@/lib/store";

function BagIcon() {
  return (
    <svg
      width="54"
      height="54"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const { add, notify } = useCart();
  const router = useRouter();

  const fetchPage = useCallback(async (p: number) => {
    const res = await fetch(`/api/auth/orders?page=${p}`, { cache: "no-store" });
    if (!res.ok) throw new Error("orders");
    return (await res.json()) as {
      orders: CustomerOrder[];
      hasMore: boolean;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const json = await fetchPage(0);
        setOrders(json.orders);
        setHasMore(json.hasMore);
      } catch {
        setError("Could not load your orders.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const json = await fetchPage(next);
      setOrders((prev) => [...prev, ...json.orders]);
      setHasMore(json.hasMore);
      setPage(next);
    } catch {
      setError("Could not load more orders.");
    } finally {
      setLoadingMore(false);
    }
  }

  /**
   * Re-price against the live menu, then fill the cart.
   *
   * Deals are re-checked too — a deal that has been retired or switched off
   * should not reappear in someone's basket at last year's price.
   */
  async function reorder(order: CustomerOrder) {
    setReorderingId(order.id);
    try {
      const lines = orderLines(order.items);
      const res = await fetch(`/api/menu/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });

      if (!res.ok) throw new Error("lookup");
      const { resolved, missing } = (await res.json()) as {
        resolved: {
          id: string;
          kind: "item" | "deal";
          name: string;
          variantLabel: string;
          unitPrice: number;
          qty: number;
          image: string;
        }[];
        missing: string[];
      };

      for (const line of resolved) {
        add({
          id: line.id,
          kind: line.kind,
          name: line.name,
          variantLabel: line.variantLabel,
          unitPrice: line.unitPrice,
          image: line.image,
          qty: line.qty,
        });
      }

      if (resolved.length === 0) {
        notify("Nothing from that order is available right now.");
        return;
      }
      if (missing.length > 0) {
        notify("Some items are no longer available");
      }
      router.push("/cart");
    } catch {
      notify("Could not rebuild that order.");
    } finally {
      setReorderingId(null);
    }
  }

  return (
    <div className="container container--narrow" style={{ padding: "40px 0 80px" }}>
      <header className="pf-head">
        <span className="eyebrow">Master Chef account</span>
        <h1>My orders</h1>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p className="empty">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="pf-empty pf-empty--big">
          <span className="pf-empty__icon">
            <BagIcon />
          </span>
          <h2>You haven&rsquo;t ordered yet</h2>
          <p className="lede">Your orders will show up here once you place one.</p>
          <Link href="/menu" className="btn btn--gold">
            Browse our menu
          </Link>
        </div>
      ) : (
        <>
          <div className="ord-list">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onReorder={reorder}
                reordering={reorderingId === o.id}
              />
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 26 }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
