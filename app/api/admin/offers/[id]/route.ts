import { insforgeAdmin } from "@/lib/insforge";
import { normaliseCode, validateOffer, type OfferInput } from "../route";

/** PATCH /api/admin/offers/[id] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: OfferInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateOffer(body, { partial: true });
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const db = insforgeAdmin();

  // Renaming a code must not collide with another offer's.
  if (body.code !== undefined) {
    const code = normaliseCode(body.code);
    const { data: clash } = await db.database
      .from("offers")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (clash && (clash as { id: string }).id !== id) {
      return Response.json({ error: `The code "${code}" is already in use.` }, { status: 409 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (body.code !== undefined) patch.code = normaliseCode(body.code);
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.discount_type !== undefined) patch.discount_type = body.discount_type;
  if (body.discount_value !== undefined) patch.discount_value = Number(body.discount_value);
  if (body.min_order !== undefined) patch.min_order = Number(body.min_order);
  if (body.max_uses !== undefined) {
    patch.max_uses = body.max_uses === null ? null : Number(body.max_uses);
  }
  if (body.members_only !== undefined) patch.members_only = !!body.members_only;
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.expires_at !== undefined) patch.expires_at = body.expires_at || null;

  const { data, error } = await db.database
    .from("offers")
    .update(patch)
    .eq("id", id)
    .select();

  if (error) {
    console.error("[admin] offer update failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not update this offer." }, { status: 503 });
  }
  if (!data || (data as unknown[]).length === 0) {
    return Response.json({ error: "Offer not found." }, { status: 404 });
  }
  return Response.json({ ok: true, offer: (data as unknown[])[0] });
}

/**
 * DELETE /api/admin/offers/[id]
 *
 * used_offers.offer_id references this row, so an offer that customers have
 * already redeemed cannot be deleted without destroying that history. Postgres
 * would reject it anyway; catching it here turns a 503 into an explanation the
 * admin can act on — deactivating is what they almost always want.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = insforgeAdmin();

  const { data: redeemed } = await db.database
    .from("used_offers")
    .select("id")
    .eq("offer_id", id)
    .limit(1);

  if (redeemed && (redeemed as unknown[]).length > 0) {
    return Response.json(
      {
        error:
          "Customers have already used this offer, so it cannot be deleted. Set it inactive instead.",
      },
      { status: 409 }
    );
  }

  const { error } = await db.database.from("offers").delete().eq("id", id);
  if (error) {
    console.error("[admin] offer delete failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not delete this offer." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
