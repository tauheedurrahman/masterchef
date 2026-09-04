"use client";

/**
 * /profile/addresses — saved delivery addresses.
 *
 * The list is the source of truth for what checkout offers in its "Deliver to"
 * dropdown, so everything here writes straight through to the database rather
 * than keeping a local copy: an address that looks saved but is not would send
 * a rider to the wrong house.
 *
 * The add and edit flows share one form. Editing loads the row into it and
 * PATCHes; adding POSTs. Keeping them as one component means the validation
 * and the field set can never drift apart.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/lib/store";
import { PinIcon } from "@/components/Icons";
import { SITE } from "@/lib/site";

interface Address {
  id: string;
  label: string;
  street: string;
  area: string | null;
  city: string | null;
  landmark: string | null;
  is_default: boolean;
}

const LABELS = ["Home", "Work", "Other"] as const;

const EMPTY = {
  label: "Home" as string,
  street: "",
  area: "",
  city: SITE.city as string,
  landmark: "",
  is_default: false,
};

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}

export default function AddressesPage() {
  const { notify } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [max, setMax] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // null = form closed; "new" = adding; anything else = editing that id.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/addresses", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as { addresses: Address[]; max: number };
      setAddresses(json.addresses);
      setMax(json.max ?? 5);
      setError(null);
    } catch {
      setError("Could not load your addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const atLimit = addresses.length >= max;

  function openNew() {
    setForm({ ...EMPTY, is_default: addresses.length === 0 });
    setFormError(null);
    setEditing("new");
  }

  function openEdit(a: Address) {
    setForm({
      label: a.label ?? "Home",
      street: a.street ?? "",
      area: a.area ?? "",
      city: a.city ?? SITE.city,
      landmark: a.landmark ?? "",
      is_default: a.is_default,
    });
    setFormError(null);
    setEditing(a.id);
  }

  function closeForm() {
    setEditing(null);
    setFormError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.street.trim()) {
      setFormError("Street address is required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const adding = editing === "new";
      const res = await fetch(
        adding ? "/api/auth/addresses" : `/api/auth/addresses/${editing}`,
        {
          method: adding ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save that address.");

      await load();
      closeForm();
      notify(adding ? "Address saved." : "Address updated.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that address.");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(a: Address) {
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/auth/addresses/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error("default");
      await load();
      notify(`${a.label} is now your default address.`);
    } catch {
      notify("Could not update that address.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(a: Address) {
    // A deleted address cannot be recovered, and the rider only ever sees the
    // one picked at checkout, so a confirm is worth the extra tap.
    if (!window.confirm(`Delete the "${a.label}" address?`)) return;

    setBusyId(a.id);
    try {
      const res = await fetch(`/api/auth/addresses/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      if (editing === a.id) closeForm();
      await load();
      notify("Address deleted.");
    } catch {
      notify("Could not delete that address.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container container--narrow" style={{ padding: "40px 0 80px" }}>
      <header className="pf-head">
        <span className="eyebrow">Master Chef account</span>
        <h1>My addresses</h1>
        <p className="lede">
          Save up to {max} addresses and pick one at checkout instead of typing it out.
        </p>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p className="empty">Loading your addresses…</p>
      ) : (
        <>
          {addresses.length === 0 ? (
            <div className="pf-empty">
              <p>No saved addresses yet.</p>
            </div>
          ) : (
            <div className="addr-grid">
              {addresses.map((a) => (
                <article className="addr" key={a.id} data-default={a.is_default}>
                  <div className="addr__top">
                    <span className="badge badge--outline">
                      <PinIcon size={12} /> {a.label}
                    </span>
                    {a.is_default && (
                      <span className="addr__star">
                        <StarIcon /> Default
                      </span>
                    )}
                  </div>

                  <p className="addr__lines">
                    {a.street}
                    <br />
                    {[a.area, a.city].filter(Boolean).join(", ")}
                  </p>
                  {a.landmark && <p className="addr__landmark">Near {a.landmark}</p>}

                  <div className="addr__acts">
                    <button
                      type="button"
                      className="addr__act"
                      onClick={() => openEdit(a)}
                      disabled={busyId === a.id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="addr__act addr__act--danger"
                      onClick={() => remove(a)}
                      disabled={busyId === a.id}
                    >
                      Delete
                    </button>
                    {!a.is_default && (
                      <button
                        type="button"
                        className="addr__act"
                        onClick={() => setDefault(a)}
                        disabled={busyId === a.id}
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <section style={{ marginTop: 26 }}>
            {atLimit && editing === null && (
              <p className="limit-note">
                You can save up to {max} addresses. Delete one to add another.
              </p>
            )}

            {editing === null ? (
              <button type="button" className="btn" onClick={openNew} disabled={atLimit}>
                Add new address
              </button>
            ) : (
              <div className="panel">
                <div className="panel__head">
                  <h3>{editing === "new" ? "Add a new address" : "Edit address"}</h3>
                </div>

                <form className="stack" onSubmit={save}>
                  <div className="form-field">
                    <span className="field-label">Label</span>
                    <div className="pill-row">
                      {LABELS.map((l) => (
                        <label key={l} className="pill-radio" data-on={form.label === l}>
                          <input
                            type="radio"
                            name="addr-label"
                            value={l}
                            checked={form.label === l}
                            onChange={() => setForm({ ...form, label: l })}
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="ad-street">
                      Street address <span className="req">*</span>
                    </label>
                    <input
                      id="ad-street"
                      className="input"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      placeholder="House / flat, street"
                      autoComplete="street-address"
                      required
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="ad-area">Area / locality</label>
                      <input
                        id="ad-area"
                        className="input"
                        value={form.area}
                        onChange={(e) => setForm({ ...form, area: e.target.value })}
                        placeholder="e.g. Gulbahar No. 3"
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="ad-city">City</label>
                      <input
                        id="ad-city"
                        className="input"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        autoComplete="address-level2"
                      />
                    </div>

                    <div className="form-field form-field--full">
                      <label htmlFor="ad-landmark">Landmark (optional)</label>
                      <input
                        id="ad-landmark"
                        className="input"
                        value={form.landmark}
                        onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                        placeholder="Near Jan Bakers"
                      />
                    </div>
                  </div>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    />
                    Set as my default address
                  </label>

                  {formError && <p className="auth-error">{formError}</p>}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="submit" className="btn" disabled={saving}>
                      {saving ? "Saving…" : "Save address"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={closeForm}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
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
