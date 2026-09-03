"use client";

import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";

interface Deal {
  id: string;
  name: string;
  price: number;
  includes: string[];
  image: string | null;
  midnight: boolean;
  featured: boolean;
  available: boolean;
}

const blank = (): Deal => ({
  id: "", name: "", price: 0, includes: [""], image: "",
  midnight: false, featured: false, available: true,
});

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]) : typeof v === "string" ? (JSON.parse(v || "[]") as string[]) : [];

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [isNewDeal, setIsNewDeal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/deals", { cache: "no-store" });
      if (!res.ok) throw new Error("deals");
      const json = await res.json();
      setDeals((json.deals as Deal[]).map((d) => ({ ...d, includes: asList(d.includes) })));
      setError(null);
    } catch {
      setError("Could not load deals.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Partial<Deal>) {
    const res = await fetch(`/api/admin/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Update failed.");
    }
  }

  async function toggleAvailable(deal: Deal) {
    setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, available: !d.available } : d)));
    try {
      await patch(deal.id, { available: !deal.available });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
      load();
    }
  }

  async function remove(deal: Deal) {
    if (!window.confirm(`Delete "${deal.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/deals/${deal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      setNotice(`Deleted ${deal.name}.`);
      load();
    } catch {
      setError("Could not delete that deal.");
    }
  }

  async function uploadImage(file: File) {
    if (!editing) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", editing.id || editing.name);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setEditing({ ...editing, image: json.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: editing.name,
        price: Number(editing.price),
        includes: editing.includes.filter((x) => x.trim()),
        image: editing.image || null,
        midnight: editing.midnight,
        featured: editing.featured,
        available: editing.available,
      };
      const res = await fetch(
        isNewDeal ? "/api/admin/deals" : `/api/admin/deals/${editing.id}`,
        {
          method: isNewDeal ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isNewDeal ? { ...payload, id: editing.id || undefined } : payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      setNotice(isNewDeal ? "Deal created." : "Deal saved.");
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
          <h1>Deals</h1>
          <p className="adm__sub">{deals.length} deals</p>
        </div>
        <button type="button" className="adm__btn"
          onClick={() => { setEditing(blank()); setIsNewDeal(true); setError(null); }}>
          Add new deal
        </button>
      </div>

      {error && <div className="adm__error">{error}</div>}
      {notice && <div className="adm__ok">{notice}</div>}

      <div className="adm__card">
        <div className="adm__tablewrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Price</th><th>Includes</th>
                <th>Midnight</th><th>Available</th><th></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <b>{deal.name}</b>
                    <div style={{ color: "#6f6459", fontSize: 12 }}>{deal.id}</div>
                  </td>
                  <td className="adm__num">{money(deal.price)}</td>
                  <td style={{ fontSize: 12.5, color: "#6f6459", maxWidth: 260 }}>
                    {deal.includes.join(" + ") || "—"}
                  </td>
                  <td>{deal.midnight ? "Yes" : "—"}</td>
                  <td>
                    <label className="adm__switch">
                      <input type="checkbox" checked={deal.available}
                        onChange={() => toggleAvailable(deal)}
                        aria-label={`${deal.name} available`} />
                      <span />
                    </label>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                      onClick={() => { setEditing({ ...deal }); setIsNewDeal(false); setError(null); }}>
                      Edit
                    </button>{" "}
                    <button type="button" className="adm__btn adm__btn--danger adm__btn--sm"
                      onClick={() => remove(deal)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="adm__backdrop" onClick={() => !busy && setEditing(null)}>
          <div className="adm__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{isNewDeal ? "New deal" : `Edit ${editing.name}`}</h2>
            <form onSubmit={save}>
              {isNewDeal && (
                <div className="adm__field">
                  <label htmlFor="d-id">Id (optional — derived from the name)</label>
                  <input id="d-id" type="text" value={editing.id}
                    onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
                </div>
              )}

              <div className="adm__row">
                <div className="adm__field" style={{ flex: 2, minWidth: 180 }}>
                  <label htmlFor="d-name">Name</label>
                  <input id="d-name" type="text" value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
                </div>
                <div className="adm__field" style={{ flex: 1, minWidth: 120 }}>
                  <label htmlFor="d-price">Price (Rs)</label>
                  <input id="d-price" type="number" min={0} value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} required />
                </div>
              </div>

              <div className="adm__field">
                <label>Includes</label>
                {editing.includes.map((line, i) => (
                  <div className="adm__row" key={i} style={{ marginBottom: 8 }}>
                    <input type="text" value={line} style={{ flex: 1, minWidth: 200 }}
                      placeholder="e.g. 2 Zinger Burger"
                      onChange={(e) => {
                        const includes = [...editing.includes];
                        includes[i] = e.target.value;
                        setEditing({ ...editing, includes });
                      }} />
                    <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                      disabled={editing.includes.length === 1}
                      onClick={() => setEditing({
                        ...editing,
                        includes: editing.includes.filter((_, x) => x !== i),
                      })}>Remove</button>
                  </div>
                ))}
                <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                  onClick={() => setEditing({ ...editing, includes: [...editing.includes, ""] })}>
                  Add line
                </button>
              </div>

              <div className="adm__field">
                <label htmlFor="d-image">Image</label>
                <div className="adm__row">
                  <input id="d-image" type="text" placeholder="Image URL"
                    value={editing.image ?? ""} style={{ flex: 2, minWidth: 180 }}
                    onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ flex: 1, minWidth: 150 }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file);
                    }} />
                </div>
              </div>

              <div className="adm__row" style={{ marginBottom: 16 }}>
                {([["midnight", "Midnight deal"], ["featured", "Featured"],
                   ["available", "Available"]] as const).map(([key, label]) => (
                  <label className="adm__check" key={key}>
                    <input type="checkbox" checked={Boolean(editing[key])}
                      onChange={(e) => setEditing({ ...editing, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="adm__row">
                <button type="submit" className="adm__btn" disabled={busy}>
                  {busy ? "Saving…" : isNewDeal ? "Create deal" : "Save changes"}
                </button>
                <button type="button" className="adm__btn adm__btn--ghost"
                  onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
