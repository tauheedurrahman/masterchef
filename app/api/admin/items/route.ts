import { insforgeAdmin } from "@/lib/insforge";

const CATEGORIES = [
  "burgers", "shawarma", "paratha-roll", "fries",
  "appetizers", "continental", "pizza", "platters",
];

export type ItemInput = {
  id?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  variants?: { label: string; price: number }[];
  description?: string;
  images?: string[];
  spicy?: boolean;
  featured?: boolean;
  is_new?: boolean;
  trending?: boolean;
  available?: boolean;
  sort_order?: number;
};

/** Turns a name into a url-safe id, e.g. "Zinger Burger" -> "zinger-burger". */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** Shared shape check for create and update. Returns an error string or null. */
export function validateItem(body: ItemInput, { partial = false } = {}): string | null {
  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) return "Name is required.";
  }
  if (!partial || body.category !== undefined) {
    if (!body.category || !CATEGORIES.includes(body.category))
      return `Category must be one of: ${CATEGORIES.join(", ")}`;
  }
  if (!partial || body.subcategory !== undefined) {
    if (!body.subcategory?.trim()) return "Subcategory is required.";
  }
  if (!partial || body.variants !== undefined) {
    if (!Array.isArray(body.variants) || body.variants.length === 0)
      return "At least one variant is required.";
    for (const v of body.variants) {
      if (!v?.label?.trim()) return "Every variant needs a label.";
      if (!Number.isFinite(Number(v.price)) || Number(v.price) < 0)
        return "Every variant needs a price of 0 or more.";
    }
  }
  return null;
}

/** GET /api/admin/items — every item, including unavailable ones. */
export async function GET() {
  const { data, error } = await insforgeAdmin()
    .database.from("menu_items")
    .select()
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin] items read failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not load items." }, { status: 503 });
  }
  return Response.json({ items: data ?? [] });
}

/** POST /api/admin/items — create. */
export async function POST(request: Request) {
  let body: ItemInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateItem(body);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const db = insforgeAdmin();
  const id = body.id?.trim() || slugify(body.name!);

  const { data: clash } = await db.database
    .from("menu_items").select("id").eq("id", id).maybeSingle();
  if (clash) return Response.json({ error: `An item with id "${id}" already exists.` }, { status: 409 });

  // New items land at the end of the list.
  const { data: last } = await db.database
    .from("menu_items").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextOrder = ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await db.database.from("menu_items").insert([{
    id,
    name: body.name!.trim(),
    category: body.category,
    subcategory: body.subcategory!.trim(),
    variants: body.variants!.map((v) => ({ label: v.label.trim(), price: Number(v.price) })),
    description: body.description?.trim() ?? "",
    images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
    spicy: !!body.spicy,
    featured: !!body.featured,
    is_new: !!body.is_new,
    trending: !!body.trending,
    available: body.available !== false,
    sort_order: body.sort_order ?? nextOrder,
  }]).select();

  if (error) {
    console.error("[admin] item create failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not create this item." }, { status: 503 });
  }
  return Response.json({ ok: true, item: (data as unknown[])?.[0] }, { status: 201 });
}
