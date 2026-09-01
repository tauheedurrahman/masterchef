/**
 * Money formatting for the whole app.
 * All prices in MASTER CHEF are integer PKR — never fractional.
 *
 *   money(1450) === "Rs 1,450"
 */
export function money(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `Rs ${rounded.toLocaleString("en-US")}`;
}

/** Lowest price across an item's variants — used for "From Rs X" on cards. */
export function minPrice(variants: { price: number }[]): number {
  return variants.reduce(
    (lowest, v) => (v.price < lowest ? v.price : lowest),
    variants[0]?.price ?? 0
  );
}
