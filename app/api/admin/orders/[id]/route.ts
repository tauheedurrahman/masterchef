import { insforgeAdmin } from "@/lib/insforge";

const STATUSES = ["new", "preparing", "out_for_delivery", "delivered", "cancelled"];

/** PATCH /api/admin/orders/[id] — change status. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.status || !STATUSES.includes(body.status)) {
    return Response.json(
      { error: `status must be one of: ${STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await insforgeAdmin()
    .database.from("orders")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) {
    console.error("[admin] order update failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not update this order." }, { status: 503 });
  }
  if (!data || (data as unknown[]).length === 0) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  return Response.json({ ok: true, order: (data as unknown[])[0] });
}
