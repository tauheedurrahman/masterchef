"use client";

import { MinusIcon, PlusIcon } from "./Icons";

export default function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 30,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <div className={`qty${size === "sm" ? " qty--sm" : ""}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <MinusIcon size={size === "sm" ? 14 : 17} />
      </button>
      <span className="qty__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <PlusIcon size={size === "sm" ? 14 : 17} />
      </button>
    </div>
  );
}
