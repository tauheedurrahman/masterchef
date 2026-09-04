import Link from "next/link";
import Hero from "@/components/Hero";
import CartNudge from "@/components/CartNudge";
import CategoryStrip from "@/components/CategoryStrip";
import MenuItemCard from "@/components/MenuItemCard";
import DealCard from "@/components/DealCard";
import MidnightBadge from "@/components/MidnightBadge";
import NewsletterForm from "@/components/NewsletterForm";
import Reveal from "@/components/Reveal";
import {
  ArrowRightIcon,
  LeafIcon,
  PhoneIcon,
  ScooterIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/Icons";
import {
  getDeals,
  getFeatured,
  getMidnightDeals,
  getNewArrivals,
  getTrending,
} from "@/lib/api";
import { SITE } from "@/lib/site";

const WHY = [
  {
    icon: <LeafIcon size={22} />,
    title: "Fresh daily",
    body: "Chicken marinated in-house every morning and cooked only once you order.",
  },
  {
    icon: <ScooterIcon size={22} />,
    title: "Fast delivery",
    body: `Riders across Peshawar — most orders land in ${SITE.etaMinutes}.`,
  },
  {
    icon: <ShieldIcon size={22} />,
    title: "100% Halal",
    body: "Certified halal meat and separate prep lines, no exceptions.",
  },
  {
    icon: <UsersIcon size={22} />,
    title: "Family deals",
    body: "Thirteen value deals built for sharing, including two after midnight.",
  },
];

export default async function HomePage() {
  const [featured, newArrivals, trending, deals, midnightDeals] =
    await Promise.all([
      getFeatured(8),
      getNewArrivals(4),
      getTrending(4),
      getDeals(),
      getMidnightDeals(),
    ]);

  const showcaseDeals = deals.filter((d) => d.featured).slice(0, 3);

  return (
    <>
      <Hero />

      {/* Only renders for a signed-in customer with a stale saved cart. */}
      <CartNudge />

      {/* ------------------------- Category strip ------------------------ */}
      <section className="section section--tight" id="categories">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Browse the kitchen</span>
                <h2>What are you craving?</h2>
              </div>
              <Link href="/menu" className="link-arrow">
                Full menu <ArrowRightIcon size={16} />
              </Link>
            </div>
          </Reveal>
          <Reveal>
            <CategoryStrip />
          </Reveal>
        </div>
      </section>

      {/* --------------------------- Deals showcase ---------------------- */}
      <section className="section section--alt">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow eyebrow--red">Save more</span>
                <h2>Deals worth ordering for</h2>
                <p className="lede">
                  Built for two, built for the whole table — every deal comes
                  with the sides and the drink.
                </p>
              </div>
              <Link href="/deals" className="link-arrow">
                All 13 deals <ArrowRightIcon size={16} />
              </Link>
            </div>
          </Reveal>

          <Reveal group className="grid grid--3">
            {showcaseDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------------------- Bestsellers ------------------------ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Bestsellers</span>
                <h2>The ones everybody orders</h2>
              </div>
              <Link href="/menu" className="link-arrow">
                See all <ArrowRightIcon size={16} />
              </Link>
            </div>
          </Reveal>

          <Reveal group className="grid">
            {featured.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* --------------------------- Promo banners ----------------------- */}
      <section className="section section--tight">
        <div className="container">
          <Reveal group className="banner-row">
            <div className="banner banner--red">
              <span className="eyebrow" style={{ color: "rgba(255,255,255,.8)" }}>
                No delivery charges
              </span>
              <h3>Free delivery over Rs 1,500</h3>
              <p>Order for the family and the ride is on us, anywhere in Peshawar.</p>
              <span className="banner__glyph" aria-hidden="true">
                <ScooterIcon size={128} />
              </span>
            </div>

            <a
              href={`tel:${SITE.phoneTel[0]}`}
              className="banner banner--gold"
            >
              <span className="eyebrow" style={{ color: "rgba(23,19,15,.65)" }}>
                Prefer to talk?
              </span>
              <h3>Call to order: {SITE.phones[0]}</h3>
              <p>Lines open all day and right through the midnight window.</p>
              <span className="banner__glyph" aria-hidden="true">
                <PhoneIcon size={128} />
              </span>
            </a>
          </Reveal>
        </div>
      </section>

      {/* --------------------------- New arrivals ------------------------ */}
      {newArrivals.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div className="section-head__text">
                  <span className="eyebrow">Just launched</span>
                  <h2>New on the menu</h2>
                </div>
              </div>
            </Reveal>
            <Reveal group className="grid">
              {newArrivals.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* ----------------------------- Trending -------------------------- */}
      {trending.length > 0 && (
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div className="section-head__text">
                  <span className="eyebrow eyebrow--red">Trending this week</span>
                  <h2>Flying out of the kitchen</h2>
                </div>
              </div>
            </Reveal>
            <Reveal group className="grid">
              {trending.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* ------------------------- Midnight teaser ----------------------- */}
      <section className="section section--tight">
        <div className="container">
          <Reveal>
            <div className="midnight">
              <span className="midnight__stars" aria-hidden="true" />
              <div className="midnight__body">
                <MidnightBadge />
                <h2 style={{ marginTop: 16 }}>Midnight deals</h2>
                <p className="lede">
                  When the city goes quiet the fryers stay on. Two late-night
                  deals — {midnightDeals.map((d) => d.name).join(" and ")} —
                  priced for the after-hours crowd.
                </p>
              </div>
              <div className="midnight__cta">
                <Link href="/deals#midnight" className="btn btn--gold">
                  See midnight deals <ArrowRightIcon size={16} />
                </Link>
                <span className="text-muted" style={{ fontSize: ".84rem" }}>
                  Available from 10:30 PM, every night
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------- Why Master Chef ---------------------- */}
      <section className="section section--cream edge-top">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow eyebrow--red">Why Master Chef</span>
                <h2>Fast food, done properly</h2>
              </div>
            </div>
          </Reveal>

          <Reveal group className="why-grid">
            {WHY.map((w) => (
              <div className="why" key={w.title}>
                <span className="why__icon">{w.icon}</span>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------------------- Newsletter ------------------------- */}
      <section className="section section--alt">
        <div className="container">
          <Reveal className="newsletter">
            <div>
              <span className="eyebrow">Stay in the loop</span>
              <h2>Deals on WhatsApp, before anyone else</h2>
              <p className="lede">
                New items, weekend offers and the midnight menu — straight to
                your phone. No spam, unsubscribe any time.
              </p>
            </div>
            <div>
              <NewsletterForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
