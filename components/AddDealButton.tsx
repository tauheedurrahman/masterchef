"use client";

import { useCart } from "@/lib/store";
import { PlusIcon } from "./Icons";
import type { Deal } from "@/lib/data";

/** Deals have no variants — they go into the cart as a single flat line. */
export default function AddDealButton({
  deal,
  className = "btn btn--sm",
}: {
  deal: Deal;
  className?: string;
}) {
  const { add } = useCart();

  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        add({
          id: deal.id,
          kind: "deal",
          name: deal.name,
          variantLabel: "Deal",
          unitPrice: deal.price,
          image: deal.image,
        })
      }
    >
      <PlusIcon size={15} />
      Add deal
    </button>
  );
}
