import { requireCustomer, type AuthedCustomer } from "../_lib/session";

export const MAX_ADDRESSES = 5;

export type AddressInput = {
  label?: string;
  street?: string;
  area?: string | null;
  city?: string | null;
  landmark?: string | null;
  is_default?: boolean;
};

export function validateAddress(body: AddressInput, { partial = false } = {}): string | null {
  if (!partial || body.street !== undefined) {
    if (!body.street?.trim()) return "Street address is required.";
    if (body.street.trim().length > 200) return "That address is too long.";
  }
  if (body.label !== undefined && body.label.trim().length > 20) {
    return "That label is too long.";
  }
  return null;
}

/**
 * Exactly one address per customer carries is_default.
 *
 * Done as a follow-up update rather than a trigger so the rule lives next to
 * the code that depends on it. It runs through the caller's scoped client, so
 * it can only ever clear the caller's own flags.
 */
export async function clearOtherDefaults(auth: AuthedCustomer, keepId: string) {
  await auth.db.database
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", auth.customer.id)
    .neq("id", keepId);
}

/** GET /api/auth/addresses — the caller's saved addresses, default first. */
export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.auth.db.database
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", guard.auth.customer.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[auth] addresses read failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not load your addresses." }, { status: 503 });
  }
  return Response.json({ addresses: data ?? [], max: MAX_ADDRESSES });
}

/** POST /api/auth/addresses — add one, up to MAX_ADDRESSES. */
export async function POST(request: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  let body: AddressInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateAddress(body);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const { data: existing, error: countError } = await auth.db.database
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", auth.customer.id);

  if (countError) {
    return Response.json({ error: "Could not save that address." }, { status: 503 });
  }

  const current = (existing as unknown[] | null) ?? [];
  if (current.length >= MAX_ADDRESSES) {
    return Response.json(
      {
        error: `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`,
        code: "LIMIT",
      },
      { status: 409 }
    );
  }

  // The very first address is the default whether or not they ticked the box —
  // otherwise checkout would have nothing pre-selected.
  const makeDefault = body.is_default === true || current.length === 0;

  const { data, error } = await auth.db.database
    .from("customer_addresses")
    .insert([
      {
        customer_id: auth.customer.id,
        label: body.label?.trim() || "Home",
        street: body.street!.trim(),
        area: body.area?.trim() || null,
        city: body.city?.trim() || "Peshawar",
        landmark: body.landmark?.trim() || null,
        is_default: makeDefault,
      },
    ])
    .select();

  if (error || !data || (data as unknown[]).length === 0) {
    console.error(
      "[auth] address insert failed:",
      (error as { message?: string } | null)?.message ?? error
    );
    return Response.json({ error: "Could not save that address." }, { status: 503 });
  }

  const created = (data as { id: string }[])[0];
  if (makeDefault) await clearOtherDefaults(auth, created.id);

  return Response.json({ address: created }, { status: 201 });
}
