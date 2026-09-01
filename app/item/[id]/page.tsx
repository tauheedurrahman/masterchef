import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ItemGallery from "@/components/ItemGallery";
import ItemPurchasePanel from "@/components/ItemPurchasePanel";
import MenuItemCard from "@/components/MenuItemCard";
import Reveal from "@/components/Reveal";
import { getItemById, getItems, getRelated } from "@/lib/api";
import { categoryInfo } from "@/lib/data";

type Params = { id: string };

export async function generateStaticParams() {
  const items = await getItems();
  return items.map((i) => ({ id: i.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) return { title: "Item not found" };
  return {
    title: item.name,
    description: item.description,
    openGraph: { images: [item.images[0]] },
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) notFound();

  const related = await getRelated(item.id, 4);
  const info = categoryInfo(item.category);

  return (
    <>
      <div className="container">
        <div className="detail">
          <ItemGallery images={item.images} alt={item.name} />
          <ItemPurchasePanel item={item} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div className="section-head__text">
                  <span className="eyebrow">More from {info?.name ?? "the menu"}</span>
                  <h2>You might also like</h2>
                </div>
              </div>
            </Reveal>
            <Reveal group className="grid">
              {related.map((r) => (
                <MenuItemCard key={r.id} item={r} />
              ))}
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
