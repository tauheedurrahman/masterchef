import { insforgeAdmin } from "@/lib/insforge";

/**
 * Valid categories come from the categories table, not a constant.
 *
 * They used to be hard-coded here, which meant a category created in the
 * dashboard could not actually be assigned to an item — this check rejected it
 * before the row ever reached Postgres. The database is the authority now:
 * menu_items.category is a foreign key onto categories(id).
 */
async function knownCategories(): Promise<string[]> {
  const { data, error } = await insforgeAdmin().database.from("categories").select("id");
  if (error) {
    console.error("[admin] category list read failed:", error.message ?? error);
    return [];
  }
  return ((data ?? []) as { id: string }[]).map((c) => c.id);
}

/** Returns an error string when the category is unknown, else null. */
async function checkCategory(category: string | undefined): Promise<string | null> {
  if (!category) return "Category is required.";
  const known = await knownCategories();
  // An empty list means the read failed; the foreign key still guards the
  // insert, so do not block a legitimate save on a transient outage.
  if (known.length === 0) return null;
  if (!known.includes(category)) {
    return `Category must be one of: ${known.join(", ")}`;
  }
  return null;
}

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

/**
 * Normalises the two image slots into the [primary, hover] pair the storefront
 * expects.
 *
 * The form holds images in fixed slots, so uploading only into the hover slot
 * leaves a hole at index 0. A plain `.filter(Boolean)` would silently promote
 * the hover shot to primary; this keeps slot order and, when only one image is
 * supplied, uses it for both.
 */
export function normaliseImages(images?: unknown): string[] {
  const raw = Array.isArray(images) ? images : [];
  const primary = typeof raw[0] === "string" ? raw[0].trim() : "";
  const hover = typeof raw[1] === "string" ? raw[1].trim() : "";

  const first = primary || hover;
  if (!first) return [];
  return [first, hover || first];
}

/**
 * A free id derived from the name, e.g. "Test Burger" -> "test-burger", then
 * "test-burger-2" if that is taken.
 *
 * Adding an item that happens to share a name with an existing one is a normal
 * thing to do (a seasonal re-run, a renamed variant), so it should not be an
 * error the admin has to resolve by inventing an id by hand.
 */
async function uniqueId(
  db: ReturnType<typeof insforgeAdmin>,
  base: string
): Promise<string> {
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data } = await db.database
      .from("menu_items").select("id").eq("id", candidate).maybeSingle();
    if (!data) return candidate;
  }
  // Fifty collisions means something is wrong with the name, not the counter.
  return `${base}-${Date.now()}`;
}

/** Shared shape check for create and update. Returns an error string or null. */
export { checkCategory };

export function validateItem(body: ItemInput, { partial = false } = {}): string | null {
  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) return "Name is required.";
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

  const badCategory = await checkCategory(body.category);
  if (badCategory) return Response.json({ error: badCategory }, { status: 400 });

  const db = insforgeAdmin();

  // An explicitly typed id must be respected exactly, so a collision there is a
  // real mistake. A derived one just steps to the next free suffix.
  const explicitId = body.id?.trim();
  let id: string;
  if (explicitId) {
    const { data: clash } = await db.database
      .from("menu_items").select("id").eq("id", explicitId).maybeSingle();
    if (clash) {
      return Response.json(
        { error: `An item with id "${explicitId}" already exists.` },
        { status: 409 }
      );
    }
    id = explicitId;
  } else {
    id = await uniqueId(db, slugify(body.name!));
  }

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
    images: normaliseImages(body.images),
    spicy: !!body.spicy,
    featured: !!body.featured,
    is_new: !!body.is_new,
    trending: !!body.trending,
    available: body.available !== false,
    sort_order: body.sort_order ?? nextOrder,
  }]).select();

  if (error) {
    const detail = error.message ?? JSON.stringify(error);
    console.error("[admin] item create failed:", detail);
    return Response.json(
      { error: `Could not create this item: ${detail}` },
      { status: 503 }
    );
  }
  return Response.json({ ok: true, item: (data as unknown[])?.[0] }, { status: 201 });
}
