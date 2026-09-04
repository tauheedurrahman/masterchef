import type { Metadata } from "next";
import Link from "next/link";
import MenuTabBar from "@/components/MenuTabBar";
import MenuItemCard from "@/components/MenuItemCard";
import DealCard from "@/components/DealCard";
import Reveal from "@/components/Reveal";
import { ArrowRightIcon } from "@/components/Icons";
import { getDeals, getItems, getMidnightDeals } from "@/lib/api";
import { CATEGORIES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Full menu",
  description:
    "The complete Master Chef menu — burgers, shawarma, paratha rolls, pizza, fries, appetizers, continental and platters.",
};

export default async function MenuPage() {
  // One read of the menu, grouped here, rather than getItems({ category }) per
  // category: every one of those calls re-reads the whole menu_items table, so
  // eight of them cost eight full round trips to the backend for the same rows
  // and made this the slowest page on the site. Grouping a single default-sorted
  // list gives each section exactly the order it had before — the sort is
  // stable and reads the same flags either way.
  const [items, deals, midnight] = await Promise.all([
    getItems(),
    getDeals(),
    getMidnightDeals(),
  ]);

  const sections = CATEGORIES.map((c) => ({
    category: c,
    items: items.filter((i) => i.category === c.slug),
  }));

  // Midnight bundles sit last: DealCard flags them "After 10:30 PM", so they
  // read as an extra rather than something missing during the day.
  const allDeals = [...deals, ...midnight];

  const populated = sections.filter((s) => s.items.length > 0);
  const tabs = populated.map((s) => ({
    id: s.category.slug,
    label: s.category.name,
  }));

  const total = populated.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Menu</span>
          </div>
          <span className="eyebrow">{total} items · {populated.length} categories</span>
          <h1>The full menu</h1>
          <p className="lede">
            Everything we cook, in one place. Tap a category to jump straight to
            it — or head to the deals page if you are feeding a crowd.
          </p>
        </div>
      </header>

      <MenuTabBar tabs={tabs} />

      <div className="container">
        {populated.map((section) => (
          <section
            key={section.category.slug}
            id={section.category.slug}
            className="menu-section"
          >
            <Reveal>
              <div className="menu-section__head">
                <div>
                  <span className="eyebrow">{section.category.tagline}</span>
                  <h2>{section.category.name}</h2>
                </div>
                <Link
                  href={`/menu/${section.category.slug}`}
                  className="link-arrow"
                >
                  Filter &amp; sort <ArrowRightIcon size={16} />
                </Link>
              </div>
            </Reveal>

            <Reveal group className="grid">
              {section.items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </Reveal>
          </section>
        ))}
      </div>

      {/* ------------------------------ Deals ---------------------------- */}
      {allDeals.length > 0 && (
        <section className="section section--alt" id="deals">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div className="section-head__text">
                  <span className="eyebrow eyebrow--red">
                    {allDeals.length} bundles
                  </span>
                  <h2>Deals</h2>
                  <p className="lede">
                    A full order in one tap — mains, sides and the drink, with
                    no size to choose.
                  </p>
                </div>
                <Link href="/deals" className="link-arrow">
                  All deals <ArrowRightIcon size={16} />
                </Link>
              </div>
            </Reveal>

            <Reveal group className="grid grid--2">
              {allDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
