"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SafeImage from "./SafeImage";
import { ArrowRightIcon, CheckIcon, PhoneIcon } from "./Icons";
import { deliveryFeeFor, FREE_DELIVERY_THRESHOLD, useCart } from "@/lib/store";
import { money } from "@/lib/format";
import { SITE } from "@/lib/site";

type OrderType = "delivery" | "pickup";
type Payment = "cod" | "card";

interface Placed {
  number: string;
  type: OrderType;
  total: number;
  payment: Payment;
}

const PHONE_RE = /^03\d{2}-?\d{7}$/;

export default function CheckoutView() {
  const { lines, hydrated, subtotal, clear, notify } = useCart();

  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [payment, setPayment] = useState<Payment>("cod");
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    area: "",
    city: SITE.city,
    landmark: "",
    timeNote: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Pickup zeroes the delivery fee — same rule the cart page uses.
  const deliveryFee = deliveryFeeFor(subtotal, orderType === "pickup");
  const total = subtotal + deliveryFee;

  const count = useMemo(
    () => lines.reduce((n, l) => n + l.qty, 0),
    [lines]
  );

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Please tell us who the order is for.";
    if (!form.phone.trim()) next.phone = "A phone number is required.";
    else if (!PHONE_RE.test(form.phone.trim()))
      next.phone = "Use the format 03XX-XXXXXXX.";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = "That email address does not look right.";

    if (orderType === "delivery") {
      if (!form.address.trim()) next.address = "We need a street address.";
      if (!form.area.trim()) next.area = "Which area are we delivering to?";
      if (!form.city.trim()) next.city = "City is required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      // Take the customer to the first thing that needs fixing.
      document
        .querySelector('[data-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
          },
          deliveryAddress:
            orderType === "delivery"
              ? {
                  street: form.address.trim(),
                  area: form.area.trim(),
                  city: form.city.trim(),
                  landmark: form.landmark.trim(),
                }
              : null,
          items: lines.map((l) => ({
            // id lets the server re-price the line from the database — the
            // price below is only a hint and is never trusted.
            id: l.id,
            name: l.name,
            variant: l.kind === "deal" ? "Deal" : l.variantLabel,
            price: l.unitPrice,
            quantity: l.qty,
          })),
          paymentMethod: payment,
          specialInstructions: form.timeNote.trim(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { orderNumber } = (await res.json()) as { orderNumber: string };

      setPlaced({ number: orderNumber, type: orderType, total, payment });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // Cart is deliberately left intact so the customer can retry.
      notify("Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  /* --------------------------- Confirmation --------------------------- */
  if (placed) {
    return (
      <div className="container">
        <div className="confirm">
          <div className="confirm__tick">
            <CheckIcon size={38} />
          </div>
          <span className="eyebrow">Order confirmed</span>
          <h1>Thank you — we&apos;re cooking</h1>
          <div className="confirm__no">{placed.number}</div>
          <p className="lede" style={{ marginInline: "auto" }}>
            {placed.type === "delivery"
              ? "Our rider will call when they are close. Please keep your phone nearby."
              : "Your order will be ready at the counter — just give the order number."}
          </p>

          <div className="confirm__meta">
            <div>
              <b>{placed.type === "delivery" ? SITE.etaMinutes : "15–20 min"}</b>
              <span>
                {placed.type === "delivery" ? "Estimated delivery" : "Ready for pickup"}
              </span>
            </div>
            <div>
              <b className="price">{money(placed.total)}</b>
              <span>Order total</span>
            </div>
            <div>
              <b>{placed.payment === "cod" ? "Cash" : "Card (demo)"}</b>
              <span>Payment</span>
            </div>
          </div>

          <div className="confirm__actions">
            <a href={`tel:${SITE.phoneTel[0]}`} className="btn">
              <PhoneIcon size={17} /> Call us
            </a>
            <Link href="/menu" className="btn btn--ghost">
              Order something else
            </Link>
          </div>

          <p className="summary__note" style={{ marginTop: 30 }}>
            This is a demo storefront — no payment was taken and no order was
            sent to the kitchen.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------ Guards ------------------------------ */
  if (!hydrated) {
    return (
      <div className="container" style={{ paddingBlock: 80 }}>
        <p className="text-muted">Loading your order…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container" style={{ paddingBlock: "20px 90px" }}>
        <div className="empty">
          <h3>Nothing to check out</h3>
          <p>Your cart is empty — add something from the menu first.</p>
          <Link href="/menu" className="btn" style={{ marginTop: 22 }}>
            Browse the menu <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------- Form ------------------------------- */
  return (
    <div className="container">
      <form className="checkout-layout" onSubmit={placeOrder} noValidate>
        <div>
          {/* 1. Order type */}
          <section className="panel">
            <div className="panel__head">
              <span className="panel__num">1</span>
              <h3>How would you like it?</h3>
            </div>

            <div className="toggle" role="tablist" aria-label="Order type">
              {(["delivery", "pickup"] as OrderType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={orderType === t}
                  data-active={orderType === t ? "true" : "false"}
                  onClick={() => setOrderType(t)}
                >
                  {t === "delivery" ? "Delivery" : "Pickup"}
                </button>
              ))}
            </div>

            <p className="summary__note">
              {orderType === "delivery"
                ? `Delivery across Peshawar — free over ${money(FREE_DELIVERY_THRESHOLD)}, otherwise ${money(SITE.deliveryFee)}.`
                : `Collect from ${SITE.address}. No delivery fee on pickup orders.`}
            </p>
          </section>

          {/* 2. Contact */}
          <section className="panel">
            <div className="panel__head">
              <span className="panel__num">2</span>
              <h3>Contact details</h3>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="name">
                  Full name <span className="req">*</span>
                </label>
                <input
                  id="name"
                  className="input"
                  value={form.name}
                  onChange={set("name")}
                  data-invalid={errors.name ? "true" : "false"}
                  autoComplete="name"
                  placeholder="e.g. Bilal Khan"
                />
                {errors.name && <span className="error">{errors.name}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="phone">
                  Phone <span className="req">*</span>
                </label>
                <input
                  id="phone"
                  className="input"
                  inputMode="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  data-invalid={errors.phone ? "true" : "false"}
                  autoComplete="tel"
                  placeholder="03XX-XXXXXXX"
                />
                {errors.phone ? (
                  <span className="error">{errors.phone}</span>
                ) : (
                  <span className="hint">Format: 03XX-XXXXXXX</span>
                )}
              </div>

              <div className="form-field form-field--full">
                <label htmlFor="email">Email (optional)</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  data-invalid={errors.email ? "true" : "false"}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
            </div>
          </section>

          {/* 3. Delivery details — hidden entirely for pickup */}
          {orderType === "delivery" && (
            <section className="panel">
              <div className="panel__head">
                <span className="panel__num">3</span>
                <h3>Delivery details</h3>
              </div>

              <div className="form-grid">
                <div className="form-field form-field--full">
                  <label htmlFor="address">
                    Street address <span className="req">*</span>
                  </label>
                  <input
                    id="address"
                    className="input"
                    value={form.address}
                    onChange={set("address")}
                    data-invalid={errors.address ? "true" : "false"}
                    autoComplete="street-address"
                    placeholder="House / flat, street"
                  />
                  {errors.address && (
                    <span className="error">{errors.address}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="area">
                    Area / locality <span className="req">*</span>
                  </label>
                  <input
                    id="area"
                    className="input"
                    value={form.area}
                    onChange={set("area")}
                    data-invalid={errors.area ? "true" : "false"}
                    placeholder="e.g. Gulbahar No. 3"
                  />
                  {errors.area && <span className="error">{errors.area}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="city">
                    City <span className="req">*</span>
                  </label>
                  <input
                    id="city"
                    className="input"
                    value={form.city}
                    onChange={set("city")}
                    data-invalid={errors.city ? "true" : "false"}
                    autoComplete="address-level2"
                  />
                  {errors.city && <span className="error">{errors.city}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="landmark">Landmark (optional)</label>
                  <input
                    id="landmark"
                    className="input"
                    value={form.landmark}
                    onChange={set("landmark")}
                    placeholder="Near Jan Bakers"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="timeNote">Delivery time note (optional)</label>
                  <input
                    id="timeNote"
                    className="input"
                    value={form.timeNote}
                    onChange={set("timeNote")}
                    placeholder="Ring the bell, deliver after 9pm…"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 4. Payment */}
          <section className="panel">
            <div className="panel__head">
              <span className="panel__num">{orderType === "delivery" ? 4 : 3}</span>
              <h3>Payment</h3>
            </div>

            <div className="radio-row">
              <label className="radio" data-selected={payment === "cod" ? "true" : "false"}>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={payment === "cod"}
                  onChange={() => setPayment("cod")}
                />
                <span className="radio__dot" aria-hidden="true" />
                <span className="radio__text">
                  <b>Cash on {orderType === "delivery" ? "delivery" : "pickup"}</b>
                  <span>Pay the rider or the counter when your food arrives.</span>
                </span>
              </label>

              <label className="radio" data-selected={payment === "card" ? "true" : "false"}>
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={payment === "card"}
                  onChange={() => setPayment("card")}
                />
                <span className="radio__dot" aria-hidden="true" />
                <span className="radio__text">
                  <b>Card — demo only</b>
                  <span>Not processed. Shown to demonstrate the flow.</span>
                </span>
              </label>
            </div>

            {payment === "card" && (
              <>
                <div className="form-grid" style={{ marginTop: 18 }}>
                  <div className="form-field form-field--full">
                    <label htmlFor="cardNumber">Card number</label>
                    <input
                      id="cardNumber"
                      className="input"
                      inputMode="numeric"
                      value={form.cardNumber}
                      onChange={set("cardNumber")}
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="cardExpiry">Expiry</label>
                    <input
                      id="cardExpiry"
                      className="input"
                      value={form.cardExpiry}
                      onChange={set("cardExpiry")}
                      placeholder="MM / YY"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="cardCvc">CVC</label>
                    <input
                      id="cardCvc"
                      className="input"
                      value={form.cardCvc}
                      onChange={set("cardCvc")}
                      placeholder="123"
                    />
                  </div>
                </div>
                <p className="demo-note">
                  Demo only — these fields are not validated, not stored and not
                  processed. Do not enter real card details.
                </p>
              </>
            )}
          </section>
        </div>

        {/* Summary panel */}
        <aside className="summary">
          <h3>Your order</h3>

          <div className="mini-lines">
            {lines.map((l) => (
              <div className="mini-line" key={l.key}>
                <span className="mini-line__img">
                  <SafeImage
                    src={l.image}
                    alt=""
                    fill
                    sizes="48px"
                    style={{ objectFit: "cover" }}
                  />
                </span>
                <span className="mini-line__meta">
                  <span className="mini-line__name">
                    {l.qty} × {l.name}
                  </span>
                  <span className="mini-line__sub">
                    {l.kind === "deal" ? "Deal" : l.variantLabel}
                  </span>
                </span>
                <span className="mini-line__price price">
                  {money(l.unitPrice * l.qty)}
                </span>
              </div>
            ))}
          </div>

          <hr className="hairline" />

          <div className="summary__row">
            <span>
              Subtotal ({count} {count === 1 ? "item" : "items"})
            </span>
            <b className="price">{money(subtotal)}</b>
          </div>
          <div className="summary__row">
            <span>{orderType === "pickup" ? "Pickup" : "Delivery fee"}</span>
            <b className="price">
              {deliveryFee === 0 ? "Free" : money(deliveryFee)}
            </b>
          </div>
          <div className="summary__row summary__row--total">
            <span>Total</span>
            <b className="price">{money(total)}</b>
          </div>

          <button type="submit" className="btn btn--block" style={{ marginTop: 20 }}>
            Place order · {money(total)}
          </button>

          <p className="summary__note">
            By placing this order you agree to be called on the number above.
            Demo storefront — nothing is charged.
          </p>
        </aside>
      </form>
    </div>
  );
}
