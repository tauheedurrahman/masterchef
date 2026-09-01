"use client";

import { money } from "@/lib/format";
import type { Variant } from "@/lib/data";

/** Size / portion picker. A variant is always required before adding to cart. */
export default function VariantSelector({
  variants,
  selected,
  onSelect,
}: {
  variants: Variant[];
  selected: string | null;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="variants" role="radiogroup" aria-label="Choose a size">
      {variants.map((v) => {
        const isSelected = v.label === selected;
        return (
          <button
            key={v.label}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className="variant"
            data-selected={isSelected ? "true" : "false"}
            onClick={() => onSelect(v.label)}
          >
            <span className="variant__label">{v.label}</span>
            <span className="variant__price">{money(v.price)}</span>
          </button>
        );
      })}
    </div>
  );
}
