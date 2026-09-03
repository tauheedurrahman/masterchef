"use client";

import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";

interface Offer {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  members_only: boolean;
  active: boolean;
  expires_at: string | null;
}

const blank = (): Offer => ({
  id: "",
  code: "",
  title: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order: 0,
  max_uses: null,
  used_count: 0,
  members_only: true,
  active: true,
  expires_at: null,
});

/** `expires_at` is a timestamptz; <input type="date"> wants `YYYY-MM-DD`. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}

function describe(o: Offer): string {
  const amount = o.discount_type === "percentage" ? `${o.discount_value}% off` : `${money(o.discount_value)} off`;
  const min = o.min_order > 0 ? ` over ${money(o.min_order)}` : "";
  return amount + min;
}

function expiryLabel(iso: string | null): { text: string; expired: boolean } {
  if (!iso) return { text: "No expiry", expired: false };
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return { text: "—", expired: false };
  return {
    text: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    expired: d.getTime() < Date.now(),
  };
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [isNewOffer, setIsNewOffer] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/offers", { cache: "no-store" });
      if (!res.ok) throw new Error("offers");
      const json = await res.json();
      setOffers(json.offers as Offer[]);
      setError(null);
    } catch {
      setError("Could not load offers.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(offer: Offer) {
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, active: !o.active } : o))
    );
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !offer.active }),
      });
      if (!res.ok) throw new Error("patch");
    } catch {
      setError("Could not change that offer.");
      load();
    }
  }

  async function remove(offer: Offer) {
    if (!window.confirm(`Delete "${offer.code}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not delete that offer.");
      setNotice(`Deleted ${offer.code}.`);
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that offer.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        code: editing.code,
        title: editing.title,
        description: editing.description || null,
        discount_type: editing.discount_type,
        discount_value: Number(editing.discount_value),
        min_order: Number(editing.min_order),
        max_uses:
          editing.max_uses === null || String(editing.max_uses) === ""
            ? null
            : Number(editing.max_uses),
        members_only: editing.members_only,
        active: editing.active,
        expires_at: editing.expires_at || null,
      };
      const res = await fetch(
        isNewOffer ? "/api/admin/offers" : `/api/admin/offers/${editing.id}`,
        {
          method: isNewOffer ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      setNotice(isNewOffer ? "Offer created." : "Offer saved.");
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Offers</h1>
          <p className="adm__sub">
            {offers.length} codes · {offers.filter((o) => o.active).length} active
          </p>
        </div>
        <button
          type="button"
          className="adm__btn"
          onClick={() => {
            setEditing(blank());
            setIsNewOffer(true);
            setError(null);
          }}
        >
          Add new offer
        </button>
      </div>

      {error && <div className="adm__error">{error}</div>}
      {notice && <div className="adm__ok">{notice}</div>}

      <div className="adm__card">
        {offers.length === 0 ? (
          <p className="adm__empty">No offers yet.</p>
        ) : (
          <div className="adm__tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th className="adm__num">Min order</th>
                  <th>Members</th>
                  <th className="adm__num">Used</th>
                  <th>Expires</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => {
                  const exp = expiryLabel(offer.expires_at);
                  return (
                    <tr key={offer.id}>
                      <td>
                        <b>{offer.code}</b>
                        <div style={{ color: "#6f6459", fontSize: 12 }}>{offer.title}</div>
                      </td>
                      <td>{describe(offer)}</td>
                      <td className="adm__num">
                        {offer.min_order > 0 ? money(offer.min_order) : "—"}
                      </td>
                      <td>{offer.members_only ? "Members only" : "Everyone"}</td>
                      <td className="adm__num">
                        {offer.used_count}
                        {offer.max_uses ? ` / ${offer.max_uses}` : ""}
                      </td>
                      <td
                        style={{
                          whiteSpace: "nowrap",
                          color: exp.expired ? "#b4342b" : "#6f6459",
                        }}
                      >
                        {exp.text}
                        {exp.expired && " (expired)"}
                      </td>
                      <td>
                        <label className="adm__switch">
                          <input
                            type="checkbox"
                            checked={offer.active}
                            onChange={() => toggleActive(offer)}
                            aria-label={`${offer.code} active`}
                          />
                          <span />
                        </label>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="adm__btn adm__btn--ghost adm__btn--sm"
                          onClick={() => {
                            setEditing({ ...offer });
                            setIsNewOffer(false);
                            setError(null);
                          }}
                        >
                          Edit
                        </button>{" "}
                        <button
                          type="button"
                          className="adm__btn adm__btn--danger adm__btn--sm"
                          onClick={() => remove(offer)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="adm__backdrop" onClick={() => !busy && setEditing(null)}>
          <div className="adm__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{isNewOffer ? "New offer" : `Edit ${editing.code}`}</h2>
            <form onSubmit={save}>
              <div className="adm__row">
                <div className="adm__field" style={{ flex: 1, minWidth: 150 }}>
                  <label htmlFor="o-code">Code</label>
                  <input
                    id="o-code"
                    type="text"
                    value={editing.code}
                    placeholder="WELCOME20"
                    onChange={(e) =>
                      setEditing({ ...editing, code: e.target.value.toUpperCase() })
                    }
                    required
                  />
                </div>
                <div className="adm__field" style={{ flex: 2, minWidth: 200 }}>
                  <label htmlFor="o-title">Title</label>
                  <input
                    id="o-title"
                    type="text"
                    value={editing.title}
                    placeholder="Welcome! 20% off first order"
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="adm__field">
                <label htmlFor="o-desc">Description</label>
                <input
                  id="o-desc"
                  type="text"
                  value={editing.description ?? ""}
                  placeholder="Shown to customers on their offers page"
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div className="adm__row">
                <div className="adm__field" style={{ flex: 1, minWidth: 140 }}>
                  <label htmlFor="o-type">Type</label>
                  <select
                    id="o-type"
                    value={editing.discount_type}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        discount_type: e.target.value as Offer["discount_type"],
                      })
                    }
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div className="adm__field" style={{ flex: 1, minWidth: 120 }}>
                  <label htmlFor="o-value">
                    Value {editing.discount_type === "percentage" ? "(%)" : "(Rs)"}
                  </label>
                  <input
                    id="o-value"
                    type="number"
                    min={1}
                    max={editing.discount_type === "percentage" ? 100 : undefined}
                    value={editing.discount_value}
                    onChange={(e) =>
                      setEditing({ ...editing, discount_value: Number(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="adm__field" style={{ flex: 1, minWidth: 130 }}>
                  <label htmlFor="o-min">Min order (Rs)</label>
                  <input
                    id="o-min"
                    type="number"
                    min={0}
                    value={editing.min_order}
                    onChange={(e) =>
                      setEditing({ ...editing, min_order: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="adm__row">
                <div className="adm__field" style={{ flex: 1, minWidth: 150 }}>
                  <label htmlFor="o-max">Max uses (blank = unlimited)</label>
                  <input
                    id="o-max"
                    type="number"
                    min={1}
                    value={editing.max_uses ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        max_uses: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="adm__field" style={{ flex: 1, minWidth: 150 }}>
                  <label htmlFor="o-exp">Expires (blank = never)</label>
                  <input
                    id="o-exp"
                    type="date"
                    value={toDateInput(editing.expires_at)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        expires_at: e.target.value
                          ? new Date(`${e.target.value}T23:59:59`).toISOString()
                          : null,
                      })
                    }
                  />
                </div>
              </div>

              <div className="adm__row" style={{ marginBottom: 16 }}>
                <label className="adm__check">
                  <input
                    type="checkbox"
                    checked={editing.members_only}
                    onChange={(e) =>
                      setEditing({ ...editing, members_only: e.target.checked })
                    }
                  />
                  Members only
                </label>
                <label className="adm__check">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              {!isNewOffer && editing.used_count > 0 && (
                <p className="adm__sub" style={{ marginBottom: 14 }}>
                  Redeemed {editing.used_count} time{editing.used_count === 1 ? "" : "s"} —
                  deleting is blocked, set it inactive instead.
                </p>
              )}

              <div className="adm__row">
                <button type="submit" className="adm__btn" disabled={busy}>
                  {busy ? "Saving…" : isNewOffer ? "Create offer" : "Save changes"}
                </button>
                <button
                  type="button"
                  className="adm__btn adm__btn--ghost"
                  onClick={() => setEditing(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
