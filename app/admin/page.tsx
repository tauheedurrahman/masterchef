"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";
import { STATUS_LABELS, StatusPill, timeAgo, type OrderRow } from "./ui";

interface Stats {
  today: { orders: number; revenue: number; averageOrderValue: number };
  byStatus: Record<string, number>;
  topItems: { name: string; qty: number; revenue: number }[];
  recent: OrderRow[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("stats");
      setStats(await res.json());
      setError(null);
    } catch {
      setError("Could not load today's numbers.");
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const maxStatus = stats
    ? Math.max(1, ...Object.values(stats.byStatus))
    : 1;

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Dashboard</h1>
          <p className="adm__sub">Today at Master Chef</p>
        </div>
        <Link href="/admin/orders" className="adm__btn adm__btn--ghost">
          View all orders
        </Link>
      </div>

      {error && <div className="adm__error">{error}</div>}

      <div className="adm__grid adm__grid--stats" style={{ marginBottom: 16 }}>
        <div className="adm__card adm__stat">
          <b className="adm__num">{stats?.today.orders ?? "—"}</b>
          <span>Orders today</span>
        </div>
        <div className="adm__card adm__stat">
          <b className="adm__num">{stats ? money(stats.today.revenue) : "—"}</b>
          <span>Revenue today</span>
        </div>
        <div className="adm__card adm__stat">
          <b className="adm__num">{stats ? money(stats.today.averageOrderValue) : "—"}</b>
          <span>Average order</span>
        </div>
      </div>

      <div className="adm__grid adm__grid--2">
        <div className="adm__card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Orders by status</h3>
          {stats
            ? Object.entries(stats.byStatus).map(([status, count]) => (
                <div className="adm__bar" key={status}>
                  <span>{STATUS_LABELS[status] ?? status}</span>
                  <span className="adm__bar-track">
                    <span
                      className="adm__bar-fill"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </span>
                  <b className="adm__num">{count}</b>
                </div>
              ))
            : <p className="adm__empty">Loading…</p>}
        </div>

        <div className="adm__card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Top 5 today</h3>
          {stats?.topItems.length ? (
            <table>
              <tbody>
                {stats.topItems.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td className="adm__num" style={{ width: 60, textAlign: "right" }}>
                      ×{t.qty}
                    </td>
                    <td className="adm__num" style={{ width: 90, textAlign: "right" }}>
                      {money(t.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="adm__empty">Nothing sold yet today.</p>
          )}
        </div>
      </div>

      <div className="adm__card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 14 }}>Recent orders</h3>
        {stats?.recent.length ? (
          <div className="adm__tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((o) => (
                  <tr
                    key={o.id}
                    data-clickable="true"
                    onClick={() => setOpen(open === o.id ? null : o.id)}
                  >
                    <td>
                      <b>{o.order_number}</b>
                      {open === o.id && (
                        <div style={{ marginTop: 8, fontSize: 12.5, color: "#6f6459" }}>
                          {(Array.isArray(o.items) ? o.items : []).map((l, i) => (
                            <div key={i}>
                              {l.quantity} × {l.name}
                              {l.variant ? ` (${l.variant})` : ""} — {money(l.lineTotal)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{o.customer_name}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="adm__num" style={{ textAlign: "right" }}>{money(o.total)}</td>
                    <td style={{ color: "#6f6459" }}>{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm__empty">No orders yet.</p>
        )}
      </div>
    </>
  );
}
