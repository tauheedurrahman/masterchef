"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { money } from "@/lib/format";

interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  area: string | null;
  city: string | null;
  loyalty_points: number;
  orders: number;
  spent: number;
  created_at: string;
}

type SortKey = "recent" | "spent" | "orders" | "name";

const joined = (iso: string) => {
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "—";
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      if (!res.ok) throw new Error("customers");
      const json = await res.json();
      setCustomers(json.customers as CustomerRow[]);
      setError(null);
    } catch {
      setError("Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Small dataset for a single restaurant, so search and sort stay on the
  // client — typing filters instantly with no round trip.
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? customers.filter((c) =>
          [c.full_name, c.phone, c.email ?? "", c.area ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : [...customers];

    switch (sort) {
      case "spent":
        return list.sort((a, b) => b.spent - a.spent);
      case "orders":
        return list.sort((a, b) => b.orders - a.orders);
      case "name":
        return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      default:
        return list;
    }
  }, [customers, query, sort]);

  const totals = useMemo(
    () => ({
      spent: customers.reduce((sum, c) => sum + c.spent, 0),
      orders: customers.reduce((sum, c) => sum + c.orders, 0),
    }),
    [customers]
  );

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Customers</h1>
          <p className="adm__sub">
            {customers.length} registered · {totals.orders} orders · {money(totals.spent)} lifetime
          </p>
        </div>
      </div>

      {error && <div className="adm__error">{error}</div>}

      <div className="adm__card">
        <div className="adm__row" style={{ marginBottom: 16 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email or area"
            aria-label="Search customers"
            style={{ flex: 2, minWidth: 220 }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort customers"
            style={{ flex: 1, minWidth: 150 }}
          >
            <option value="recent">Newest first</option>
            <option value="spent">Highest spend</option>
            <option value="orders">Most orders</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {loading ? (
          <p className="adm__empty">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="adm__empty">
            {customers.length === 0
              ? "No customers have signed up yet."
              : `No customer matches “${query}”.`}
          </p>
        ) : (
          <div className="adm__tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Area</th>
                  <th className="adm__num">Orders</th>
                  <th className="adm__num">Spent</th>
                  <th className="adm__num">Points</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.full_name}</b>
                      {c.email && (
                        <div style={{ color: "#6f6459", fontSize: 12 }}>{c.email}</div>
                      )}
                    </td>
                    <td>
                      <a href={`tel:${c.phone.replace(/\D/g, "")}`}>{c.phone}</a>
                    </td>
                    <td style={{ color: "#6f6459" }}>{c.area || "—"}</td>
                    <td className="adm__num">{c.orders}</td>
                    <td className="adm__num">{money(c.spent)}</td>
                    <td className="adm__num">{c.loyalty_points}</td>
                    <td style={{ color: "#6f6459", whiteSpace: "nowrap" }}>
                      {joined(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
