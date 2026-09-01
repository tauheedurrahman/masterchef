"use client";

import { useCart } from "@/lib/store";
import { PlusIcon } from "./Icons";
import type { MenuItem } from "@/lib/data";

/**
 * "Quick add" on listing cards. Adds the item's FIRST (cheapest) variant —
 * anyone who wants another size taps through to the detail page.
 */
export default function QuickAddButton({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const variant = item.variants.reduce(
    (cheapest, v) => (v.price < cheapest.price ? v : cheapest),
    item.variants[0]
  );

  return (
    <button
      type="button"
      className="card__quick"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add({
          id: item.id,
          kind: "item",
          name: item.name,
          variantLabel: variant.label,
          unitPrice: variant.price,
          image: item.images[0],
        });
      }}
      aria-label={`Quick add ${item.name} (${variant.label}) to cart`}
    >
      <PlusIcon size={14} />
      Quick add
    </button>
  );
}
