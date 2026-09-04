import { insforgeAdmin } from "@/lib/insforge";

/**
 * Category CRUD for the admin dashboard.
 *
 * menu_items.category is a foreign key onto this table, so these rows decide
 * which categories an item may carry. That is also why deleting one is not a
 * plain DELETE — see the [id] route.
 */

export type CategoryInput = {
  id?: string;
  display_name?: string;
  icon?: string | null;
  sort_order?: number;
};

/** Where items go when their category is deleted. Cannot itself be removed. */
export const FALLBACK_CATEGORY = "uncategorized";

/** Slugs are URL segments (/menu/<slug>), so the shape is strict. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyCategory(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function validateCategory(
  body: CategoryInput,
  { partial = false } = {}
): string | null {
  if (!partial) {
    const id = body.id?.trim() ?? "";
    if (!id) return "A category slug is required.";
    if (id.length > 40) return "That slug is too long (40 characters max).";
    if (!SLUG_RE.test(id)) {
      return "Slug must be lowercase letters, numbers and hyphens — no spaces.";
    }
  }
  if (!partial || body.display_name !== undefined) {
    if (!body.display_name?.trim()) return "A display name is required.";
    if (body.display_name.trim().length > 60) return "That display name is too long.";
  }
  // Emoji are multi-byte, so this is a generous character cap rather than a
  // byte one — enough for a flag or a compound emoji, not a sentence.
  if (body.icon != null && body.icon.trim().length > 8) {
    return "Use a single emoji or a very short icon.";
  }
  return null;
}

/**
 * GET /api/admin/categories — every category with a live item count.
 *
 * The count is what the dashboard warns with before a delete, so it is read
 * here rather than trusted from the client.
 */
export async function GET() {
  const db = insforgeAdmin();

  const [catRes, itemRes] = await Promise.all([
    db.database.from("categories").select("*").order("sort_order", { ascending: true }),
    db.database.from("menu_items").select("category"),
  ]);

  if (catRes.error) {
    console.error(
      "[admin] categories read failed:",
      catRes.error.message ?? JSON.stringify(catRes.error)
    );
    return Response.json({ error: "Could not load categories." }, { status: 503 });
  }

  const counts = new Map<string, number>();
  for (const row of (itemRes.data ?? []) as { category: string }[]) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  const categories = ((catRes.data ?? []) as Record<string, unknown>[]).map((c) => ({
    ...c,
    itemCount: counts.get(String(c.id)) ?? 0,
  }));

  return Response.json({ categories, fallback: FALLBACK_CATEGORY });
}

/** POST /api/admin/categories — create one. */
export async function POST(request: Request) {
  let body: CategoryInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // An empty slug is derived from the display name, the same way item ids are.
  if (!body.id?.trim() && body.display_name?.trim()) {
    body.id = slugifyCategory(body.display_name);
  }

  const problem = validateCategory(body);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const db = insforgeAdmin();
  const id = body.id!.trim();

  const { data: clash } = await db.database
    .from("categories").select("id").eq("id", id).maybeSingle();
  if (clash) {
    return Response.json(
      { error: `A category with the slug "${id}" already exists.` },
      { status: 409 }
    );
  }

  // New categories sort to the end, ahead of the uncategorized bucket.
  const { data: last } = await db.database
    .from("categories")
    .select("sort_order")
    .neq("id", FALLBACK_CATEGORY)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await db.database
    .from("categories")
    .insert([
      {
        id,
        display_name: body.display_name!.trim(),
        icon: body.icon?.trim() || null,
        sort_order: body.sort_order ?? nextOrder,
      },
    ])
    .select();

  if (error) {
    const detail = error.message ?? JSON.stringify(error);
    console.error("[admin] category create failed:", detail);
    return Response.json({ error: `Could not create that category: ${detail}` }, { status: 503 });
  }

  return Response.json({ ok: true, category: (data as unknown[])?.[0] }, { status: 201 });
}
