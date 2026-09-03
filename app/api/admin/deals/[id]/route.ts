import { insforgeAdmin } from "@/lib/insforge";
import { validateDeal, type DealInput } from "../route";

/** PATCH /api/admin/deals/[id] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: DealInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateDeal(body, { partial: true });
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.includes !== undefined) patch.includes = body.includes.filter(Boolean);
  if (body.image !== undefined) patch.image = body.image || null;
  if (body.midnight !== undefined) patch.midnight = !!body.midnight;
  if (body.featured !== undefined) patch.featured = !!body.featured;
  if (body.available !== undefined) patch.available = !!body.available;

  const { data, error } = await insforgeAdmin()
    .database.from("deals")
    .update(patch)
    .eq("id", id)
    .select();

  if (error) {
    console.error("[admin] deal update failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not update this deal." }, { status: 503 });
  }
  if (!data || (data as unknown[]).length === 0) {
    return Response.json({ error: "Deal not found." }, { status: 404 });
  }
  return Response.json({ ok: true, deal: (data as unknown[])[0] });
}

/** DELETE /api/admin/deals/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await insforgeAdmin().database.from("deals").delete().eq("id", id);

  if (error) {
    console.error("[admin] deal delete failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not delete this deal." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
