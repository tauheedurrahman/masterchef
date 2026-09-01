import type { Metadata } from "next";
import Link from "next/link";
import MenuItemCard from "@/components/MenuItemCard";
import Reveal from "@/components/Reveal";
import { getItems } from "@/lib/api";
import { CATEGORIES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Master Chef menu.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const items = term ? await getItems({ query: term }) : [];

  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Search</span>
          </div>
          <span className="eyebrow">
            {term
              ? `${items.length} ${items.length === 1 ? "result" : "results"}`
              : "Search"}
          </span>
          <h1>{term ? `“${term}”` : "Search the menu"}</h1>
        </div>
      </header>

      <div className="container" style={{ paddingBlock: "40px 76px" }}>
        {items.length > 0 ? (
          <Reveal group className="grid">
            {items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </Reveal>
        ) : (
          <div className="empty">
            <h3>{term ? "No matches" : "What are you after?"}</h3>
            <p>
              {term
                ? `Nothing on the menu matches “${term}”. Try a shorter term — “zinger”, “roll” or “fries”.`
                : "Use the search icon in the header, or jump into a category below."}
            </p>
            <div
              className="filters__pills"
              style={{ justifyContent: "center", marginTop: 24 }}
            >
              {CATEGORIES.map((c) => (
                <Link key={c.slug} href={`/menu/${c.slug}`} className="pill">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
