import type { Metadata } from "next";
import Link from "next/link";
import DealCard from "@/components/DealCard";
import MidnightBadge from "@/components/MidnightBadge";
import Reveal from "@/components/Reveal";
import { MoonIcon } from "@/components/Icons";
import { getDeals, getMidnightDeals } from "@/lib/api";

export const metadata: Metadata = {
  title: "Deals & offers",
  description:
    "All Master Chef deals — burger, shawarma and roll bundles for the family, plus midnight deals available after 10:30 PM.",
};

export default async function DealsPage() {
  const [deals, midnight] = await Promise.all([getDeals(), getMidnightDeals()]);

  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Deals</span>
          </div>
          <span className="eyebrow eyebrow--red">
            {deals.length + midnight.length} deals live right now
          </span>
          <h1>Deals &amp; offers</h1>
          <p className="lede">
            Every deal is a full order — mains, sides and the drink. Add one to
            the cart in a single tap; no size to choose.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">The regular line-up</span>
                <h2>Deals 1 – {deals.length}</h2>
              </div>
            </div>
          </Reveal>

          <Reveal group className="grid grid--2">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------------------- Midnight --------------------------- */}
      <section className="section section--alt" id="midnight">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span
                  className="eyebrow"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <MoonIcon size={14} /> After 10:30 PM
                </span>
                <h2>Midnight deals</h2>
                <p className="lede">
                  Ordered late? These two only appear on the kitchen ticket
                  after 10:30 PM, and run until the fryers go off.
                </p>
                <div style={{ marginTop: 14 }}>
                  <MidnightBadge />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal group className="grid grid--2">
            {midnight.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
