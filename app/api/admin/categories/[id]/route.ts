import { insforgeAdmin } from "@/lib/insforge";
import {
  FALLBACK_CATEGORY,
  validateCategory,
  type CategoryInput,
} from "../route";

/**
 * PATCH /api/admin/categories/[id]
 *
 * Display name, icon and sort order only. The slug is deliberately immutable:
 * it is the /menu/<slug> URL segment and is hard-coded in the storefront's
 * category list, so renaming it would break live links and hide the section.
 * Callers that try are told why rather than silently ignored.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: CategoryInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.id !== undefined && body.id.trim() !== id) {
    return Response.json(
      {
        error:
          "A category slug cannot be changed — it is the menu URL. Create a new category and move the items instead.",
        code: "SLUG_IMMUTABLE",
      },
      { status: 400 }
    );
  }

  const problem = validateCategory(body, { partial: true });
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.display_name !== undefined) patch.display_name = body.display_name.trim();
  if (body.icon !== undefined) patch.icon = body.icon?.trim() || null;
  if (body.image !== undefined) patch.image = body.image?.trim() || null;
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await insforgeAdmin()
    .database.from("categories")
    .update(patch)
    .eq("id", id)
    .select();

  if (error) {
    const detail = error.message ?? JSON.stringify(error);
    console.error("[admin] category update failed:", detail);
    return Response.json({ error: `Could not save that category: ${detail}` }, { status: 503 });
  }
  if (!data || (data as unknown[]).length === 0) {
    return Response.json({ error: "Category not found." }, { status: 404 });
  }

  return Response.json({ ok: true, category: (data as unknown[])[0] });
}

/**
 * DELETE /api/admin/categories/[id]
 *
 * Items are never deleted with the category. They are re-filed onto
 * `uncategorized` first, then the category row goes — losing a section should
 * not lose the menu with it, and the admin can put them somewhere else
 * afterwards.
 *
 * The re-file has to happen before the delete regardless of intent: the
 * foreign key on menu_items.category is ON DELETE RESTRICT, so Postgres would
 * refuse the delete while rows still point at it.
 *
 * `?confirm=1` is required. The dashboard asks twice before sending it, and
 * the flag means a stray DELETE cannot quietly empty a section.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (id === FALLBACK_CATEGORY) {
    return Response.json(
      { error: "Uncategorized cannot be deleted — it is where orphaned items go." },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "1") {
    return Response.json(
      { error: "This delete needs ?confirm=1.", code: "NEEDS_CONFIRM" },
      { status: 400 }
    );
  }

  const db = insforgeAdmin();

  const { data: existing } = await db.database
    .from("categories").select("id").eq("id", id).maybeSingle();
  if (!existing) return Response.json({ error: "Category not found." }, { status: 404 });

  const { data: items, error: itemsError } = await db.database
    .from("menu_items").select("id").eq("category", id);

  if (itemsError) {
    return Response.json({ error: "Could not check that category's items." }, { status: 503 });
  }

  const moved = ((items as unknown[]) ?? []).length;

  if (moved > 0) {
    const { error: moveError } = await db.database
      .from("menu_items")
      .update({ category: FALLBACK_CATEGORY })
      .eq("category", id);

    if (moveError) {
      const detail = moveError.message ?? JSON.stringify(moveError);
      console.error("[admin] category re-file failed:", detail);
      return Response.json(
        { error: `Could not move that category's items: ${detail}` },
        { status: 503 }
      );
    }
  }

  const { error } = await db.database.from("categories").delete().eq("id", id);

  if (error) {
    const detail = error.message ?? JSON.stringify(error);
    console.error("[admin] category delete failed:", detail);
    return Response.json({ error: `Could not delete that category: ${detail}` }, { status: 503 });
  }

  return Response.json({ ok: true, moved, movedTo: FALLBACK_CATEGORY });
}
