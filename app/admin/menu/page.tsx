"use client";

import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";

const CATEGORIES = [
  "burgers", "shawarma", "paratha-roll", "fries",
  "appetizers", "continental", "pizza", "platters",
];

interface Variant { label: string; price: number }

interface Item {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  variants: Variant[];
  description: string | null;
  images: string[];
  spicy: boolean;
  featured: boolean;
  is_new: boolean;
  trending: boolean;
  available: boolean;
  sort_order: number;
}

const blank = (): Item => ({
  id: "", name: "", category: "burgers", subcategory: "",
  variants: [{ label: "Regular", price: 0 }],
  description: "", images: [],
  spicy: false, featured: false, is_new: false, trending: false,
  available: true, sort_order: 0,
});

const asList = (v: unknown): never[] =>
  Array.isArray(v) ? (v as never[]) : typeof v === "string" ? (JSON.parse(v || "[]") as never[]) : [];

export default function AdminMenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/items", { cache: "no-store" });
      if (!res.ok) throw new Error("items");
      const json = await res.json();
      setItems(
        (json.items as Item[]).map((i) => ({
          ...i,
          variants: asList(i.variants),
          images: asList(i.images),
        }))
      );
      setError(null);
    } catch {
      setError("Could not load the menu.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Partial<Item>) {
    const res = await fetch(`/api/admin/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Update failed.");
    }
  }

  async function toggleAvailable(item: Item) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i)));
    try {
      await patch(item.id, { available: !item.available });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
      load();
    }
  }

  async function move(item: Item, direction: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const swap = sorted[idx + direction];
    if (!swap) return;
    try {
      await Promise.all([
        patch(item.id, { sort_order: swap.sort_order }),
        patch(swap.id, { sort_order: item.sort_order }),
      ]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed.");
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      setNotice(`Deleted ${item.name}.`);
      load();
    } catch {
      setError("Could not delete that item.");
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
        category: editing.category,
        subcategory: editing.subcategory,
        variants: editing.variants.map((v) => ({ label: v.label, price: Number(v.price) })),
        description: editing.description ?? "",
        images: editing.images,
        spicy: editing.spicy,
        featured: editing.featured,
        is_new: editing.is_new,
        trending: editing.trending,
        available: editing.available,
      };
      const res = await fetch(
        isNewItem ? "/api/admin/items" : `/api/admin/items/${editing.id}`,
        {
          method: isNewItem ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isNewItem ? { ...payload, id: editing.id || undefined } : payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      setNotice(isNewItem ? "Item created." : "Item saved.");
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File, slot: number) {
    if (!editing) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", editing.id || editing.name);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      const images = [...editing.images];
      images[slot] = json.url;
      setEditing({ ...editing, images });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const priceRange = (v: Variant[]) => {
    if (!v.length) return "—";
    const prices = v.map((x) => Number(x.price));
    const lo = Math.min(...prices), hi = Math.max(...prices);
    return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
  };

  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Menu</h1>
          <p className="adm__sub">{items.length} items</p>
        </div>
        <button
          type="button" className="adm__btn"
          onClick={() => { setEditing(blank()); setIsNewItem(true); setError(null); }}
        >
          Add new item
        </button>
      </div>

      {error && <div className="adm__error">{error}</div>}
      {notice && <div className="adm__ok">{notice}</div>}

      <div className="adm__card">
        <div className="adm__tablewrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Category</th><th>Price</th><th>Flags</th>
                <th>Available</th><th>Order</th><th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.name}</b>
                    <div style={{ color: "#6f6459", fontSize: 12 }}>{item.id}</div>
                  </td>
                  <td>
                    {item.category}
                    <div style={{ color: "#6f6459", fontSize: 12 }}>{item.subcategory}</div>
                  </td>
                  <td className="adm__num">{priceRange(item.variants)}</td>
                  <td style={{ fontSize: 12, color: "#6f6459" }}>
                    {[item.spicy && "spicy", item.featured && "featured",
                      item.is_new && "new", item.trending && "trending"]
                      .filter(Boolean).join(", ") || "—"}
                  </td>
                  <td>
                    <label className="adm__switch">
                      <input
                        type="checkbox" checked={item.available}
                        onChange={() => toggleAvailable(item)}
                        aria-label={`${item.name} available`}
                      />
                      <span />
                    </label>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                      disabled={i === 0} onClick={() => move(item, -1)} aria-label="Move up">↑</button>{" "}
                    <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                      disabled={i === sorted.length - 1} onClick={() => move(item, 1)} aria-label="Move down">↓</button>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                      onClick={() => { setEditing({ ...item }); setIsNewItem(false); setError(null); }}>
                      Edit
                    </button>{" "}
                    <button type="button" className="adm__btn adm__btn--danger adm__btn--sm"
                      onClick={() => remove(item)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------ editor ------------------------------ */}
      {editing && (
        <div className="adm__backdrop" onClick={() => !busy && setEditing(null)}>
          <div className="adm__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{isNewItem ? "New item" : `Edit ${editing.name}`}</h2>
            <form onSubmit={save}>
              {isNewItem && (
                <div className="adm__field">
                  <label htmlFor="f-id">Id (optional — derived from the name)</label>
                  <input id="f-id" type="text" value={editing.id}
                    onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
                </div>
              )}

              <div className="adm__field">
                <label htmlFor="f-name">Name</label>
                <input id="f-name" type="text" value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              </div>

              <div className="adm__row">
                <div className="adm__field" style={{ flex: 1, minWidth: 160 }}>
                  <label htmlFor="f-cat">Category</label>
                  <select id="f-cat" value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="adm__field" style={{ flex: 1, minWidth: 160 }}>
                  <label htmlFor="f-sub">Subcategory</label>
                  <input id="f-sub" type="text" value={editing.subcategory}
                    onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })} required />
                </div>
              </div>

              <div className="adm__field">
                <label htmlFor="f-desc">Description</label>
                <textarea id="f-desc" value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>

              <div className="adm__field">
                <label>Variants</label>
                {editing.variants.map((v, i) => (
                  <div className="adm__row" key={i} style={{ marginBottom: 8 }}>
                    <input type="text" placeholder="Label" value={v.label} style={{ flex: 2, minWidth: 120 }}
                      onChange={(e) => {
                        const variants = [...editing.variants];
                        variants[i] = { ...v, label: e.target.value };
                        setEditing({ ...editing, variants });
                      }} />
                    <input type="number" placeholder="Price" value={v.price} min={0} style={{ flex: 1, minWidth: 100 }}
                      onChange={(e) => {
                        const variants = [...editing.variants];
                        variants[i] = { ...v, price: Number(e.target.value) };
                        setEditing({ ...editing, variants });
                      }} />
                    <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                      disabled={editing.variants.length === 1}
                      onClick={() => setEditing({
                        ...editing,
                        variants: editing.variants.filter((_, x) => x !== i),
                      })}>Remove</button>
                  </div>
                ))}
                <button type="button" className="adm__btn adm__btn--ghost adm__btn--sm"
                  onClick={() => setEditing({
                    ...editing,
                    variants: [...editing.variants, { label: "", price: 0 }],
                  })}>Add variant</button>
              </div>

              <div className="adm__field">
                <label>Images (primary, then hover)</label>
                {[0, 1].map((slot) => (
                  <div className="adm__row" key={slot} style={{ marginBottom: 8 }}>
                    <input type="text" placeholder={`Image ${slot + 1} URL`}
                      value={editing.images[slot] ?? ""} style={{ flex: 2, minWidth: 180 }}
                      onChange={(e) => {
                        const images = [...editing.images];
                        images[slot] = e.target.value;
                        setEditing({ ...editing, images });
                      }} />
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ flex: 1, minWidth: 150 }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file, slot);
                      }} />
                  </div>
                ))}
              </div>

              <div className="adm__row" style={{ marginBottom: 16 }}>
                {([["spicy", "Spicy"], ["featured", "Featured"], ["is_new", "New"],
                   ["trending", "Trending"], ["available", "Available"]] as const).map(([key, label]) => (
                  <label className="adm__check" key={key}>
                    <input type="checkbox" checked={Boolean(editing[key])}
                      onChange={(e) => setEditing({ ...editing, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="adm__row">
                <button type="submit" className="adm__btn" disabled={busy}>
                  {busy ? "Saving…" : isNewItem ? "Create item" : "Save changes"}
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
