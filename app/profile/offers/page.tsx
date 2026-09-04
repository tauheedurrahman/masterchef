"use client";

/**
 * /profile/offers — the customer's promo codes, split into available and used.
 *
 * Availability is decided by the server (/api/auth/offers), not here: whether a
 * code is spent depends on used_offers, and whether it is still live depends on
 * expiry and the global claim count. The page only renders what it is told.
 *
 * Codes copy to the clipboard on click, because the next thing anyone does with
 * one is paste it into the checkout promo box.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/store";
import { money } from "@/lib/format";

interface AvailableOffer {
  code: string;
  title: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  membersOnly: boolean;
  expiresAt: string | null;
}

interface UsedOffer {
  code: string;
  title: string;
  usedAt: string;
  orderNumber: string | null;
}

function discountLabel(o: AvailableOffer): string {
  return o.discountType === "percentage" ? `${o.discountValue}% off` : `${money(o.discountValue)} off`;
}

function expiryLabel(iso: string | null): string {
  if (!iso) return "No expiry";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "No expiry";
  return `Expires ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function usedOnLabel(u: UsedOffer): string {
  const d = new Date(u.usedAt);
  const when = Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
  return u.orderNumber ? `Used on ${u.orderNumber}${when ? ` • ${when}` : ""}` : `Used${when ? ` • ${when}` : ""}`;
}

export default function OffersPage() {
  const [available, setAvailable] = useState<AvailableOffer[]>([]);
  const [used, setUsed] = useState<UsedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { notify } = useCart();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/offers", { cache: "no-store" });
        if (!res.ok) throw new Error("offers");
        const json = (await res.json()) as { available: AvailableOffer[]; used: UsedOffer[] };
        setAvailable(json.available);
        setUsed(json.used);
      } catch {
        setError("Could not load your offers.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard is blocked in some browsers without a user gesture chain.
      // The code is on screen either way, so this is not worth an error.
    }
    setCopied(code);
    window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1600);
  }

  function useNow(code: string) {
    notify(`Add items and apply ${code} at checkout!`);
    router.push("/menu");
  }

  const welcome = available.find((o) => o.code === "WELCOME20");

  return (
    <div className="container container--narrow" style={{ padding: "40px 0 80px" }}>
      <header className="pf-head">
        <span className="eyebrow">Master Chef account</span>
        <h1>My offers</h1>
        <p className="lede">Tap a code to copy it, then paste it at checkout.</p>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p className="empty">Loading your offers…</p>
      ) : (
        <>
          {welcome && (
            <div className="offer-banner">
              <p>
                🎉 Use <b>WELCOME20</b> for {welcome.discountValue}% off your first order!
              </p>
              <button type="button" className="btn btn--sm" onClick={() => useNow(welcome.code)}>
                Use Now →
              </button>
            </div>
          )}

          <section className="pf-section" style={{ marginTop: 0 }}>
            <div className="pf-section__head">
              <h2>Available</h2>
            </div>

            {available.length === 0 ? (
              <div className="pf-empty">
                <p>No offers available right now — check back soon.</p>
                <Link href="/menu" className="btn">
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div className="offer-grid">
                {available.map((o) => (
                  <article className="offer" key={o.code}>
                    <button
                      type="button"
                      className="offer__code"
                      data-copied={copied === o.code}
                      onClick={() => copy(o.code)}
                      aria-label={`Copy code ${o.code}`}
                    >
                      {o.code}
                    </button>

                    <h3 className="offer__title">{o.title}</h3>
                    {o.description && <p className="offer__desc">{o.description}</p>}

                    <div className="offer__meta">
                      <span className="offer__value">{discountLabel(o)}</span>
                      <span>
                        {o.minOrder > 0 ? `Min order ${money(o.minOrder)}` : "No minimum"}
                      </span>
                      <span>{expiryLabel(o.expiresAt)}</span>
                      {o.membersOnly && <span className="badge badge--outline">Members only</span>}
                    </div>

                    <div className="offer__foot">
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => useNow(o.code)}
                      >
                        Use Now →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {used.length > 0 && (
            <section className="pf-section">
              <div className="pf-section__head">
                <h2>Used</h2>
              </div>

              <div className="offer-grid">
                {used.map((u) => (
                  <article className="offer offer--used" key={u.code}>
                    <span className="offer__code">{u.code}</span>
                    <h3 className="offer__title">{u.title}</h3>
                    <p className="offer__desc">{usedOnLabel(u)}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p style={{ marginTop: 30 }}>
        <Link href="/profile" className="link-arrow">
          ← Back to my account
        </Link>
      </p>
    </div>
  );
}
