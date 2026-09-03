"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";
import { SITE } from "@/lib/site";
import {
  STATUSES,
  STATUS_LABELS,
  StatusPill,
  orderLines,
  timeAgo,
  type OrderRow,
} from "../ui";

const POLL_MS = 20_000;

/**
 * A short beep, generated once via WebAudio rather than shipped as a base64
 * blob — same effect, no binary in the bundle, and it respects the browser's
 * autoplay rules (it only ever fires after the operator has interacted).
 */
function chime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
    osc.onended = () => ctx.close();
  } catch {
    /* audio blocked — the visual badge still updates */
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Tracks which order numbers we've already seen, so a refill of the same
  // list doesn't re-alert. Seeded on the first load.
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(
    async (opts: { announce?: boolean } = {}) => {
      try {
        const qs = new URLSearchParams({ page: String(page) });
        if (filter !== "all") qs.set("status", filter);
        const res = await fetch(`/api/admin/orders?${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error("orders");
        const json = await res.json();
        const list = (json.orders ?? []) as OrderRow[];

        if (seen.current === null) {
          seen.current = new Set(list.map((o) => o.order_number));
        } else if (opts.announce) {
          const fresh = list.filter((o) => !seen.current!.has(o.order_number));
          for (const o of fresh) seen.current!.add(o.order_number);
          if (fresh.length) {
            chime();
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(
                fresh.length === 1 ? "New order" : `${fresh.length} new orders`,
                {
                  body: fresh
                    .slice(0, 3)
                    .map((o) => `${o.order_number} · ${o.customer_name} · ${money(o.total)}`)
                    .join("\n"),
                }
              );
            }
          }
        }

        setOrders(list);
        setTotal(json.total ?? list.length);
        setError(null);
      } catch {
        setError("Could not load orders.");
      }
    },
    [filter, page]
  );

  useEffect(() => {
    // Ask once, on first visit.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    seen.current = null; // filter/page changed — rebaseline rather than alert
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => load({ announce: true }), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  async function setStatus(id: string, status: string) {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("patch");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch {
      setError("Could not change that status.");
    } finally {
      setSaving(null);
    }
  }

  const open = orders.find((o) => o.id === openId) ?? null;
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Orders</h1>
          <p className="adm__sub">
            {total} order{total === 1 ? "" : "s"} · refreshing every 20s
          </p>
        </div>
        {open && (
          <button type="button" className="adm__btn" onClick={() => window.print()}>
            Print ticket
          </button>
        )}
      </div>

      {error && <div className="adm__error">{error}</div>}

      <div className="adm__tabs">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            className="adm__tab"
            data-active={filter === s}
            onClick={() => {
              setFilter(s);
              setPage(0);
              setOpenId(null);
            }}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="adm__card">
        {orders.length === 0 ? (
          <p className="adm__empty">No orders here yet.</p>
        ) : (
          <div className="adm__tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    data-clickable="true"
                    onClick={() => setOpenId(openId === o.id ? null : o.id)}
                  >
                    <td><b>{o.order_number}</b></td>
                    <td>{o.customer_name}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <a href={`tel:${o.phone.replace(/-/g, "")}`}>{o.phone}</a>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{o.order_type}</td>
                    <td className="adm__num" style={{ textAlign: "right" }}>{money(o.total)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={o.status}
                        disabled={saving === o.id}
                        onChange={(e) => setStatus(o.id, e.target.value)}
                        style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ color: "#6f6459", whiteSpace: "nowrap" }}>{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            <button
              type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
              disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: 13, color: "#6f6459" }}>Page {page + 1} of {pages}</span>
            <button
              type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
              disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* -------------------------- detail panel -------------------------- */}
      {open && (
        <div className="adm__card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <h3 style={{ fontSize: 15 }}>{open.order_number}</h3>
            <StatusPill status={open.status} />
          </div>

          <div className="adm__grid adm__grid--2">
            <div>
              <table>
                <tbody>
                  {orderLines(open.items).map((l, i) => (
                    <tr key={i}>
                      <td>
                        {l.quantity} × {l.name}
                        {l.variant ? <span style={{ color: "#6f6459" }}> · {l.variant}</span> : null}
                      </td>
                      <td className="adm__num" style={{ textAlign: "right", width: 90 }}>
                        {money(l.lineTotal)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ color: "#6f6459" }}>Subtotal</td>
                    <td className="adm__num" style={{ textAlign: "right" }}>{money(open.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#6f6459" }}>Delivery</td>
                    <td className="adm__num" style={{ textAlign: "right" }}>
                      {open.delivery_fee === 0 ? "Free" : money(open.delivery_fee)}
                    </td>
                  </tr>
                  <tr>
                    <td><b>Total</b></td>
                    <td className="adm__num" style={{ textAlign: "right" }}><b>{money(open.total)}</b></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              <div><b>{open.customer_name}</b></div>
              <div><a href={`tel:${open.phone.replace(/-/g, "")}`}>{open.phone}</a></div>
              {open.email && <div style={{ color: "#6f6459" }}>{open.email}</div>}
              {open.order_type === "delivery" ? (
                <div style={{ marginTop: 8 }}>
                  {open.address}
                  {open.area ? <>, {open.area}</> : null}
                  {open.city ? <>, {open.city}</> : null}
                  {open.landmark && <div style={{ color: "#6f6459" }}>Landmark: {open.landmark}</div>}
                </div>
              ) : (
                <div style={{ marginTop: 8, color: "#6f6459" }}>Pickup from the counter</div>
              )}
              {open.notes && (
                <div style={{ marginTop: 8 }}>
                  <b>Notes:</b> {open.notes}
                </div>
              )}
              <div style={{ marginTop: 8, color: "#6f6459" }}>
                Payment: {open.payment_method === "cod" ? "Cash on delivery" : "Card"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------ print-only ticket ------------------------ */}
      {open && (
        <div className="adm__ticket">
          <h2>MASTER CHEF</h2>
          <div>{SITE.address}</div>
          <hr />
          <div><b>{open.order_number}</b></div>
          <div>{new Date(open.created_at).toLocaleString()}</div>
          <div>{open.order_type === "delivery" ? "DELIVERY" : "PICKUP"}</div>
          <hr />
          <table>
            <tbody>
              {orderLines(open.items).map((l, i) => (
                <tr key={i}>
                  <td>{l.quantity} × {l.name}{l.variant ? ` (${l.variant})` : ""}</td>
                  <td style={{ textAlign: "right" }}>{money(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <table>
            <tbody>
              <tr><td>Subtotal</td><td style={{ textAlign: "right" }}>{money(open.subtotal)}</td></tr>
              <tr><td>Delivery</td><td style={{ textAlign: "right" }}>{money(open.delivery_fee)}</td></tr>
              <tr><td><b>TOTAL</b></td><td style={{ textAlign: "right" }}><b>{money(open.total)}</b></td></tr>
            </tbody>
          </table>
          <hr />
          {open.notes && (
            <div style={{ marginBottom: "2mm" }}>
              <b>NOTES:</b> {open.notes}
            </div>
          )}
          <div><b>{open.customer_name}</b> — {open.phone}</div>
          {open.order_type === "delivery" && (
            <div>
              {open.address}{open.area ? `, ${open.area}` : ""}{open.city ? `, ${open.city}` : ""}
              {open.landmark ? ` (${open.landmark})` : ""}
            </div>
          )}
          <div style={{ marginTop: "2mm" }}>
            {open.payment_method === "cod" ? "CASH ON DELIVERY" : "PAID BY CARD"}
          </div>
        </div>
      )}
    </>
  );
}
