import { insforgeAdmin } from "@/lib/insforge";
import { validateItem, checkCategory, type ItemInput, normaliseImages } from "../route";

/** PATCH /api/admin/items/[id] — partial update (also used by the toggles). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: ItemInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateItem(body, { partial: true });
  if (problem) return Response.json({ error: problem }, { status: 400 });

  // Only when the caller is actually changing the category — the availability
  // toggles PATCH a single field and must not pay for a lookup.
  if (body.category !== undefined) {
    const badCategory = await checkCategory(body.category);
    if (badCategory) return Response.json({ error: badCategory }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.category !== undefined) patch.category = body.category;
  if (body.subcategory !== undefined) patch.subcategory = body.subcategory.trim();
  if (body.variants !== undefined)
    patch.variants = body.variants.map((v) => ({ label: v.label.trim(), price: Number(v.price) }));
  if (body.description !== undefined) patch.description = body.description.trim();
  if (body.images !== undefined) patch.images = normaliseImages(body.images);
  if (body.spicy !== undefined) patch.spicy = !!body.spicy;
  if (body.featured !== undefined) patch.featured = !!body.featured;
  if (body.is_new !== undefined) patch.is_new = !!body.is_new;
  if (body.trending !== undefined) patch.trending = !!body.trending;
  if (body.available !== undefined) patch.available = !!body.available;
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);

  const { data, error } = await insforgeAdmin()
    .database.from("menu_items").update(patch).eq("id", id).select();

  if (error) {
    console.error("[admin] item update failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not update this item." }, { status: 503 });
  }
  if (!data || (data as unknown[]).length === 0) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }
  return Response.json({ ok: true, item: (data as unknown[])[0] });
}

/** DELETE /api/admin/items/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await insforgeAdmin().database.from("menu_items").delete().eq("id", id);

  if (error) {
    console.error("[admin] item delete failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not delete this item." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
