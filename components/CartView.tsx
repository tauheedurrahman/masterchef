"use client";

import Link from "next/link";
import SafeImage from "./SafeImage";
import QtyStepper from "./QtyStepper";
import { ArrowRightIcon, CartIcon, TrashIcon } from "./Icons";
import { FREE_DELIVERY_THRESHOLD, useCart } from "@/lib/store";
import { money } from "@/lib/format";

export default function CartView() {
  const {
    lines,
    hydrated,
    updateQty,
    remove,
    clear,
    count,
    subtotal,
    deliveryFee,
    total,
  } = useCart();

  // Until localStorage has been read there is nothing meaningful to show.
  if (!hydrated) {
    return (
      <div className="container" style={{ paddingBlock: 80 }}>
        <p className="text-muted">Loading your cart…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container" style={{ paddingBlock: "20px 90px" }}>
        <div className="empty">
          <h3>Your cart is empty</h3>
          <p>
            Nothing in the bag yet. Pick a zinger, a shawarma or one of the
            family deals and we will get the fryers going.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 24,
              flexWrap: "wrap",
            }}
          >
            <Link href="/menu" className="btn">
              Browse the menu <ArrowRightIcon size={16} />
            </Link>
            <Link href="/deals" className="btn btn--ghost">
              See deals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;

  return (
    <div className="container">
      <div className="cart-layout">
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span className="count">
              {count} {count === 1 ? "item" : "items"} in your cart
            </span>
            <button type="button" className="text-btn" onClick={clear}>
              Clear cart
            </button>
          </div>

          <div className="cart-lines">
            {lines.map((line) => (
              <div className="cart-line" key={line.key}>
                <span className="cart-line__img">
                  <SafeImage
                    src={line.image}
                    alt={line.name}
                    fill
                    sizes="96px"
                    style={{ objectFit: "cover" }}
                  />
                </span>

                <div>
                  <h3 className="cart-line__name">
                    {line.kind === "item" ? (
                      <Link href={`/item/${line.id}`}>{line.name}</Link>
                    ) : (
                      line.name
                    )}
                  </h3>
                  <div className="cart-line__variant">
                    {line.kind === "deal" ? "Deal" : line.variantLabel}
                  </div>
                  {line.notes && (
                    <p className="cart-line__notes">“{line.notes}”</p>
                  )}

                  <div className="cart-line__controls">
                    <QtyStepper
                      value={line.qty}
                      size="sm"
                      onChange={(next) => updateQty(line.key, next)}
                      label={`quantity of ${line.name}`}
                    />
                    <span className="cart-line__unit price">
                      {money(line.unitPrice)} each
                    </span>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => remove(line.key)}
                      aria-label={`Remove ${line.name} from cart`}
                    >
                      <TrashIcon size={13} /> Remove
                    </button>
                  </div>
                </div>

                <div className="cart-line__total price">
                  {money(line.unitPrice * line.qty)}
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/menu"
            className="link-arrow"
            style={{ marginTop: 24, display: "inline-flex" }}
          >
            Add more items <ArrowRightIcon size={16} />
          </Link>
        </div>

        <aside className="summary">
          <h3>Order summary</h3>

          <div className="summary__row">
            <span>Subtotal</span>
            <b className="price">{money(subtotal)}</b>
          </div>
          <div className="summary__row">
            <span>Delivery fee</span>
            <b className="price">
              {deliveryFee === 0 ? "Free" : money(deliveryFee)}
            </b>
          </div>
          <div className="summary__row summary__row--total">
            <span>Total</span>
            <b className="price">{money(total)}</b>
          </div>

          {remaining > 0 ? (
            <p className="free-delivery">
              Add {money(remaining)} more for free delivery.
            </p>
          ) : (
            <p className="free-delivery free-delivery--met">
              Free delivery unlocked on this order.
            </p>
          )}

          <Link
            href="/checkout"
            className="btn btn--block"
            style={{ marginTop: 20 }}
          >
            <CartIcon size={17} /> Proceed to checkout
          </Link>

          <p className="summary__note">
            Delivery is Rs 100 under Rs 1,500 and free above it. Pickup orders
            are never charged a delivery fee.
          </p>
        </aside>
      </div>
    </div>
  );
}
