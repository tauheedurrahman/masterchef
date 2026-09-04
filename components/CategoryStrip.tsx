import Link from "next/link";
import SafeImage from "./SafeImage";
import { getCategories } from "@/lib/api";
import { PLACEHOLDER_IMAGE } from "@/lib/data";

/**
 * Horizontally scrollable circular category tiles.
 *
 * The list, its order and the tile photos all come from the categories table,
 * so a category added or re-pictured in the admin dashboard shows up here
 * without a code change. A server component, so the read happens on the
 * server and no admin client reaches the browser.
 */
export default async function CategoryStrip() {
  const categories = await getCategories();

  return (
    <div className="scroll-x no-bar">
      <div className="cat-strip">
        {categories.map((c) => (
          <Link key={c.slug} href={`/menu/${c.slug}`} className="cat-tile">
            <span className="cat-tile__img">
              <SafeImage
                src={c.image || PLACEHOLDER_IMAGE}
                alt=""
                fill
                sizes="120px"
                style={{ objectFit: "cover" }}
              />
            </span>
            <span className="cat-tile__name">{c.name}</span>
          </Link>
        ))}
        <Link href="/deals" className="cat-tile">
          <span
            className="cat-tile__img"
            style={{
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(140deg, var(--accent) 0%, #8d0b1f 100%)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                color: "var(--accent-warm)",
              }}
            >
              %
            </span>
          </span>
          <span className="cat-tile__name">Deals</span>
        </Link>
      </div>
    </div>
  );
}
