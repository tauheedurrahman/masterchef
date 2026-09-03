import { requireCustomer } from "../_lib/session";
import { toCustomer } from "@/lib/auth";

/** GET /api/auth/profile */
export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  return Response.json({ customer: guard.auth.customer });
}

/**
 * POST /api/auth/profile — edit name, email and delivery defaults.
 *
 * Phone is not editable: it is the login identifier, so changing it here would
 * silently desynchronise the profile from the auth account and lock the
 * customer out. The UI shows it read-only for the same reason.
 *
 * The write goes through the caller's own scoped client, so RLS and the
 * column-level grants apply — loyalty_points and the spend totals are not
 * writable from here even if this handler tried.
 */
export async function POST(request: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  let body: {
    full_name?: string;
    email?: string | null;
    area?: string | null;
    city?: string | null;
    default_address?: string | null;
    default_landmark?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.full_name !== undefined) {
    const name = body.full_name.trim();
    if (!name) return Response.json({ error: "Name cannot be empty." }, { status: 400 });
    if (name.length > 80) {
      return Response.json({ error: "That name is too long." }, { status: 400 });
    }
    patch.full_name = name;
  }

  if (body.email !== undefined) {
    const email = (body.email ?? "").trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "That email does not look right." }, { status: 400 });
    }
    patch.email = email || null;
  }

  for (const key of ["area", "city", "default_address", "default_landmark"] as const) {
    if (body[key] !== undefined) patch[key] = (body[key] ?? "")?.toString().trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ customer: auth.customer });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await auth.db.database
    .from("customers")
    .update(patch)
    .eq("id", auth.customer.id)
    .select();

  if (error || !data || (data as unknown[]).length === 0) {
    console.error(
      "[auth] profile update failed:",
      (error as { message?: string } | null)?.message ?? error
    );
    return Response.json({ error: "Could not save your profile." }, { status: 503 });
  }

  return Response.json({
    customer: toCustomer((data as unknown[])[0] as Parameters<typeof toCustomer>[0]),
  });
}
