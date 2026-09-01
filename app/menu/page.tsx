import type { Metadata } from "next";
import Link from "next/link";
import MenuTabBar from "@/components/MenuTabBar";
import MenuItemCard from "@/components/MenuItemCard";
import Reveal from "@/components/Reveal";
import { ArrowRightIcon } from "@/components/Icons";
import { getItems } from "@/lib/api";
import { CATEGORIES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Full menu",
  description:
    "The complete Master Chef menu — burgers, shawarma, paratha rolls, pizza, fries, appetizers, continental and platters.",
};

export default async function MenuPage() {
  // One fetch per category through the api layer, in parallel.
  const sections = await Promise.all(
    CATEGORIES.map(async (c) => ({
      category: c,
      items: await getItems({ category: c.slug }),
    }))
  );

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
    </>
  );
}
