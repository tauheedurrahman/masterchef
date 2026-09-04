import Link from "next/link";
import SafeImage from "./SafeImage";
import QuickAddButton from "./QuickAddButton";
import { FlameIcon } from "./Icons";
import { money, minPrice } from "@/lib/format";
import type { MenuItemRow } from "@/lib/api";

/**
 * Listing card. Server component — only the quick-add control is interactive.
 * Price rule: more than one variant => "From Rs X".
 */
export default function MenuItemCard({
  item,
  sizes = "(max-width: 460px) 100vw, (max-width: 820px) 50vw, (max-width: 1100px) 33vw, 300px",
}: {
  item: MenuItemRow;
  sizes?: string;
}) {
  const from = minPrice(item.variants);
  const multi = item.variants.length > 1;
  // Sold-out items stay in the listing — dimmed and un-addable, not hidden.
  const soldOut = item.available === false;

  return (
    <article className="card" data-sold-out={soldOut ? "true" : "false"}>
      <div className="card__media">
        <Link
          href={`/item/${item.id}`}
          className="card__media-link"
          aria-label={item.name}
        >
          <span className="card__img card__img--base">
            <SafeImage
              src={item.images[0]}
              alt={item.name}
              fill
              sizes={sizes}
              style={{ objectFit: "cover" }}
            />
          </span>
          <span className="card__img card__img--hover" aria-hidden="true">
            <SafeImage
              src={item.images[1] ?? item.images[0]}
              alt=""
              fill
              sizes={sizes}
              style={{ objectFit: "cover" }}
            />
          </span>
        </Link>

        {soldOut && (
          <span className="card__veil" aria-hidden="true">
            <span className="card__ribbon">Sold Out</span>
          </span>
        )}

        <div className="card__flags">
          {item.isNew && <span className="badge badge--gold">New</span>}
          {item.trending && !item.isNew && <span className="badge">Trending</span>}
          {item.spicy && (
            <span className="badge badge--dark" title="Spicy">
              <FlameIcon size={12} /> Spicy
            </span>
          )}
        </div>

        <div className="card__price">
          <span className="price-badge">
            {multi && <small>From</small>}
            {money(from)}
          </span>
        </div>

        {/* No quick-add on a sold-out card — there is nothing to add. */}
        {!soldOut && <QuickAddButton item={item} />}
      </div>

      <div className="card__body">
        <span className="card__cat">{item.subcategory}</span>
        <h3 className="card__name">
          <Link href={`/item/${item.id}`}>{item.name}</Link>
        </h3>
        <p className="card__desc">{item.description}</p>

        <div className="card__foot">
          <span className="card__from price">
            {multi && <small>From</small>}
            {money(from)}
          </span>
          <span className="card__variants">
            {multi
              ? `${item.variants.length} sizes`
              : item.variants[0].label}
          </span>
        </div>
      </div>
    </article>
  );
}
