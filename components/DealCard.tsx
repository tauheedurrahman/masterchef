import SafeImage from "./SafeImage";
import AddDealButton from "./AddDealButton";
import { MoonIcon } from "./Icons";
import { money } from "@/lib/format";
import type { Deal } from "@/lib/data";

export default function DealCard({ deal }: { deal: Deal }) {
  return (
    <article
      className={`deal-card${deal.midnight ? " deal-card--midnight" : ""}`}
    >
      <div className="deal-card__media">
        <SafeImage
          src={deal.image}
          alt={deal.name}
          fill
          sizes="(max-width: 820px) 100vw, 40vw"
          style={{ objectFit: "cover" }}
        />
        <div className="card__flags">
          {deal.midnight ? (
            <span className="badge badge--gold">
              <MoonIcon size={12} /> After 10:30 PM
            </span>
          ) : (
            deal.featured && <span className="badge">Most popular</span>
          )}
        </div>
      </div>

      <div className="deal-card__body">
        <span className="eyebrow">Value deal</span>
        <h3 className="deal-card__name">{deal.name}</h3>

        <ul className="deal-card__includes">
          {deal.includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="deal-card__foot">
          <span className="deal-card__price price">{money(deal.price)}</span>
          <AddDealButton deal={deal} />
        </div>
      </div>
    </article>
  );
}
