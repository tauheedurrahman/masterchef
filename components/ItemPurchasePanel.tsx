"use client";

import Link from "next/link";
import { useState } from "react";
import VariantSelector from "./VariantSelector";
import QtyStepper from "./QtyStepper";
import { CartIcon, FlameIcon } from "./Icons";
import { useCart } from "@/lib/store";
import { minPrice, money } from "@/lib/format";
import type { MenuItem } from "@/lib/data";

/**
 * Everything interactive on the item page: variant, quantity, special
 * instructions and the add-to-cart action. The displayed price always tracks
 * the selected variant.
 */
export default function ItemPurchasePanel({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const single = item.variants.length === 1;

  // A size must be chosen before the item can be added. Single-price items
  // have nothing to choose, so they start selected.
  const [variantLabel, setVariantLabel] = useState<string | null>(
    single ? item.variants[0].label : null
  );
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const variant = item.variants.find((v) => v.label === variantLabel) ?? null;
  const lineTotal = variant ? variant.price * qty : 0;

  return (
    <div>
      <div className="crumbs">
        <Link href="/menu">Menu</Link>
        <span>/</span>
        <Link href={`/menu/${item.category}`}>
          {item.category.replace("-", " ")}
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="badge badge--outline">{item.subcategory}</span>
        {item.isNew && <span className="badge badge--gold">New</span>}
        {item.trending && <span className="badge">Trending</span>}
        {item.spicy && (
          <span className="badge badge--outline">
            <FlameIcon size={12} /> Spicy
          </span>
        )}
      </div>

      <h1 className="detail__title">{item.name}</h1>
      <div className="detail__price price">
        {variant ? (
          money(variant.price)
        ) : (
          <>
            <span
              style={{
                fontSize: ".42em",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                marginRight: 10,
                color: "var(--muted)",
              }}
            >
              From
            </span>
            {money(minPrice(item.variants))}
          </>
        )}
      </div>
      <p className="detail__desc">{item.description}</p>

      <div className="field-group">
        <span className="field-label">
          Choose size <span style={{ color: "var(--accent)" }}>*</span>
        </span>
        <VariantSelector
          variants={item.variants}
          selected={variantLabel}
          onSelect={setVariantLabel}
        />
      </div>

      <div className="field-group">
        <span className="field-label">Quantity</span>
        <QtyStepper value={qty} onChange={setQty} />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="notes">
          Special instructions (optional)
        </label>
        <textarea
          id="notes"
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Extra spicy, no onions, cut in half…"
          maxLength={240}
        />
      </div>

      <div className="detail__actions">
        <button
          type="button"
          className="btn btn--lg"
          disabled={!variant}
          onClick={() => {
            if (!variant) return;
            add({
              id: item.id,
              kind: "item",
              name: item.name,
              variantLabel: variant.label,
              unitPrice: variant.price,
              qty,
              image: item.images[0],
              notes: notes.trim() || undefined,
            });
          }}
        >
          <CartIcon size={18} />
          {variant ? `Add to cart · ${money(lineTotal)}` : "Choose a size first"}
        </button>
        <Link href="/cart" className="btn btn--lg btn--ghost">
          View cart
        </Link>
      </div>

      <div className="detail__meta">
        <span className="badge badge--outline">100% Halal</span>
        <span className="badge badge--outline">Made to order</span>
        <span className="badge badge--outline">Free delivery over Rs 1,500</span>
      </div>
    </div>
  );
}
