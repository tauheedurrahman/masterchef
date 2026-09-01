import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MenuItemCard from "@/components/MenuItemCard";
import SortSelect from "@/components/SortSelect";
import Reveal from "@/components/Reveal";
import { getItems } from "@/lib/api";
import {
  CATEGORIES,
  categoryInfo,
  subcategoriesFor,
  type CategorySlug,
} from "@/lib/data";

type Params = { category: string };
type Search = { sub?: string; sort?: string };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category } = await params;
  const info = categoryInfo(category);
  if (!info) return { title: "Category not found" };
  return {
    title: info.name,
    description: `${info.name} at Master Chef Peshawar — ${info.tagline.toLowerCase()}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { category } = await params;
  const { sub, sort = "featured" } = await searchParams;

  const info = categoryInfo(category);
  if (!info) notFound();

  const slug = info.slug as CategorySlug;

  // Filter pills come from the ACTIVE menu, so imported items show up here too.
  const subcategories = subcategoriesFor(slug);
  const activeSub = sub && subcategories.includes(sub) ? sub : undefined;

  const items = await getItems({
    category: slug,
    subcategory: activeSub,
    sort,
  });

  /** Build a listing URL that preserves the other control's state. */
  const hrefFor = (nextSub?: string) => {
    const params = new URLSearchParams();
    if (nextSub) params.set("sub", nextSub);
    if (sort && sort !== "featured") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/menu/${slug}?${qs}` : `/menu/${slug}`;
  };

  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/menu">Menu</Link>
            <span>/</span>
            <span>{info.name}</span>
          </div>
          <span className="eyebrow">{info.tagline}</span>
          <h1>{info.name}</h1>
        </div>
      </header>

      <div className="container">
        <div className="filters">
          <div className="filters__pills">
            <Link
              href={hrefFor(undefined)}
              className="pill"
              data-active={!activeSub ? "true" : "false"}
            >
              All
            </Link>
            {subcategories.map((s) => (
              <Link
                key={s}
                href={hrefFor(s)}
                className="pill"
                data-active={activeSub === s ? "true" : "false"}
              >
                {s}
              </Link>
            ))}
          </div>

          <div className="filters__right">
            <span className="count">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
            <SortSelect value={sort} />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty" style={{ marginBottom: 64 }}>
            <h3>Nothing here yet</h3>
            <p>
              No items match this filter. Try another subcategory or browse the
              full menu.
            </p>
            <Link href="/menu" className="btn btn--sm" style={{ marginTop: 20 }}>
              Full menu
            </Link>
          </div>
        ) : (
          <Reveal group className="grid" style={{ marginBottom: 72 }}>
            {items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </Reveal>
        )}
      </div>
    </>
  );
}
