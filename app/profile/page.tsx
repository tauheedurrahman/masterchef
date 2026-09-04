"use client";

/**
 * /profile — the customer's home.
 *
 * Stats, recent orders and the quick links all come from the database via
 * /api/auth/*. Edit Profile and Change Password are collapsed by default so
 * the page opens on what people actually come here for: their orders.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/store";
import { ArrowRightIcon, PinIcon, TagIcon } from "@/components/Icons";
import OrderStatusPill from "@/components/OrderStatusPill";
import type { CustomerOrder } from "@/components/OrderCard";

function memberSince(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "—";
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function lineSummary(order: CustomerOrder): string {
  const items = Array.isArray(order.items) ? order.items : [];
  return (
    items
      .map((l) => `${l.name}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`)
      .join(", ") || "—"
  );
}

/** A collapsible panel. Closed by default; the heading is the toggle. */
function Fold({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="pf-fold" data-open={open}>
      <button type="button" className="pf-fold__head" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <span className="pf-fold__chev" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && <div className="pf-fold__body">{children}</div>}
    </section>
  );
}

export default function ProfilePage() {
  const { customer, loading, signOut, setCustomer } = useAuth();
  const { notify } = useCart();
  const router = useRouter();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [counts, setCounts] = useState({ addresses: 0, offers: 0 });
  const [totalOrders, setTotalOrders] = useState(0);

  const [openFold, setOpenFold] = useState<"profile" | "password" | null>(null);

  const [profileForm, setProfileForm] = useState({ full_name: "", email: "" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (customer) {
      setProfileForm({ full_name: customer.fullName, email: customer.email ?? "" });
    }
  }, [customer]);

  const load = useCallback(async () => {
    const [ordersRes, addrRes, offersRes] = await Promise.all([
      fetch("/api/auth/orders?page=0", { cache: "no-store" }),
      fetch("/api/auth/addresses", { cache: "no-store" }),
      fetch("/api/auth/offers", { cache: "no-store" }),
    ]);

    if (ordersRes.ok) {
      const json = await ordersRes.json();
      setOrders((json.orders as CustomerOrder[]).slice(0, 3));
      setTotalOrders(json.total ?? 0);
    }
    const addresses = addrRes.ok ? ((await addrRes.json()).addresses as unknown[]).length : 0;
    const offers = offersRes.ok ? ((await offersRes.json()).available as unknown[]).length : 0;
    setCounts({ addresses, offers });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          email: profileForm.email || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save.");
      setCustomer(json.customer);
      setProfileMsg({ ok: true, text: "Profile updated." });
    } catch (err) {
      setProfileMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not change your password.");
      setPwForm({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPwMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Could not change your password.",
      });
    } finally {
      setPwBusy(false);
    }
  }

  if (loading || !customer) {
    return (
      <div className="container" style={{ padding: "48px 0 80px" }}>
        <p className="empty">Loading your account…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "40px 0 80px" }}>
      <header className="pf-head">
        <h1>Hello, {customer.fullName.split(" ")[0]}!</h1>
        <p className="lede">Member since {memberSince(customer.createdAt)}</p>
      </header>

      <div className="pf-stats">
        <div className="pf-stat">
          <b>{totalOrders}</b>
          <span>Orders</span>
        </div>
        <div className="pf-stat">
          <b>{money(customer.totalSpent)}</b>
          <span>Spent</span>
        </div>
        <div className="pf-stat">
          <b>{customer.loyaltyPoints}</b>
          <span>Points</span>
          <small>Coming soon: redeem for rewards</small>
        </div>
      </div>

      <section className="pf-section">
        <div className="pf-section__head">
          <h2>Recent orders</h2>
          <Link href="/profile/orders" className="link-arrow">
            See all <ArrowRightIcon size={14} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="pf-empty">
            <p>No orders yet.</p>
            <Link href="/menu" className="btn">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="pf-orders">
            {orders.map((o) => (
              <Link key={o.id} href="/profile/orders" className="pf-order">
                <div className="pf-order__top">
                  <b>{o.order_number}</b>
                  <span>{timeAgo(o.created_at)}</span>
                  <span className="pf-order__total">{money(o.total)}</span>
                  <OrderStatusPill status={o.status} />
                </div>
                <p className="pf-order__items">{lineSummary(o)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="pf-quick">
        <Link href="/profile/addresses" className="pf-quick__card">
          <PinIcon size={20} />
          <b>{counts.addresses}</b>
          <span>Saved Addresses</span>
        </Link>
        <Link href="/profile/offers" className="pf-quick__card">
          <TagIcon size={20} />
          <b>{counts.offers}</b>
          <span>Available Offers</span>
        </Link>
      </div>

      <Fold
        title="Edit profile"
        open={openFold === "profile"}
        onToggle={() => setOpenFold((f) => (f === "profile" ? null : "profile"))}
      >
        <form className="stack" onSubmit={saveProfile}>
          <div className="form-field">
            <label htmlFor="pf-name">Name</label>
            <input
              id="pf-name"
              className="input"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="pf-phone">Phone</label>
            <input id="pf-phone" className="input" value={customer.phone} readOnly disabled />
            <span className="hint">
              This is how you sign in, so it cannot be changed here. Call us if it needs updating.
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="pf-email">Email</label>
            <input
              id="pf-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>

          {profileMsg && (
            <p className={profileMsg.ok ? "auth-msg auth-msg--ok" : "auth-error"}>
              {profileMsg.text}
            </p>
          )}

          <button type="submit" className="btn" disabled={profileBusy}>
            {profileBusy ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </Fold>

      <Fold
        title="Change password"
        open={openFold === "password"}
        onToggle={() => setOpenFold((f) => (f === "password" ? null : "password"))}
      >
        <form className="stack" onSubmit={savePassword}>
          {(["current", "next", "confirm"] as const).map((key) => (
            <div className="form-field" key={key}>
              <label htmlFor={`pw-${key}`}>
                {key === "current" ? "Current" : key === "next" ? "New" : "Confirm"}
              </label>
              <input
                id={`pw-${key}`}
                className="input"
                type="password"
                placeholder="••••••••"
                value={pwForm[key]}
                onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                autoComplete={key === "current" ? "current-password" : "new-password"}
                required
              />
            </div>
          ))}

          {pwMsg && (
            <p className={pwMsg.ok ? "auth-msg auth-msg--ok" : "auth-error"}>{pwMsg.text}</p>
          )}

          <button type="submit" className="btn" disabled={pwBusy}>
            {pwBusy ? "Updating…" : "Update Password"}
          </button>
        </form>
      </Fold>

      <button
        type="button"
        className="pf-signout"
        onClick={async () => {
          await signOut();
          notify("Signed out.");
          router.push("/");
          router.refresh();
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
