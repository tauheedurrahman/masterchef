import { requireCustomer } from "../../_lib/session";
import { clearOtherDefaults, validateAddress, type AddressInput } from "../route";

/**
 * Both handlers filter on customer_id as well as id.
 *
 * RLS already scopes customer_addresses to the caller, so the extra filter is
 * belt and braces — but it means a wrong id returns "not found" rather than
 * silently updating zero rows and reporting success.
 */

/** PATCH /api/auth/addresses/[id] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  const { id } = await params;

  let body: AddressInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateAddress(body, { partial: true });
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.label !== undefined) patch.label = body.label.trim() || "Home";
  if (body.street !== undefined) patch.street = body.street.trim();
  if (body.area !== undefined) patch.area = body.area?.trim() || null;
  if (body.city !== undefined) patch.city = body.city?.trim() || "Peshawar";
  if (body.landmark !== undefined) patch.landmark = body.landmark?.trim() || null;
  if (body.is_default !== undefined) patch.is_default = !!body.is_default;

  const { data, error } = await auth.db.database
    .from("customer_addresses")
    .update(patch)
    .eq("id", id)
    .eq("customer_id", auth.customer.id)
    .select();

  if (error) {
    console.error("[auth] address update failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not save that address." }, { status: 503 });
  }
  if (!data || (data as unknown[]).length === 0) {
    return Response.json({ error: "Address not found." }, { status: 404 });
  }

  if (body.is_default === true) await clearOtherDefaults(auth, id);

  return Response.json({ address: (data as unknown[])[0] });
}

/**
 * DELETE /api/auth/addresses/[id]
 *
 * If the default is removed, the oldest survivor is promoted — leaving a
 * customer with addresses but no default means checkout pre-fills nothing.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  const { id } = await params;

  const { data: target } = await auth.db.database
    .from("customer_addresses")
    .select("id, is_default")
    .eq("id", id)
    .eq("customer_id", auth.customer.id)
    .maybeSingle();

  if (!target) return Response.json({ error: "Address not found." }, { status: 404 });

  const { error } = await auth.db.database
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", auth.customer.id);

  if (error) {
    console.error("[auth] address delete failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not delete that address." }, { status: 503 });
  }

  if ((target as { is_default: boolean }).is_default) {
    const { data: rest } = await auth.db.database
      .from("customer_addresses")
      .select("id")
      .eq("customer_id", auth.customer.id)
      .order("created_at", { ascending: true })
      .limit(1);

    const next = (rest as { id: string }[] | null)?.[0];
    if (next) {
      await auth.db.database
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", next.id)
        .eq("customer_id", auth.customer.id);
    }
  }

  return Response.json({ ok: true });
}
