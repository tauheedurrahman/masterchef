import { cookies } from "next/headers";
import { authActions, insforgeAdmin, insforgeServer } from "@/lib/insforge";
import { formatPhone, isValidPhone, phoneToEmail, toCustomer } from "@/lib/auth";

/**
 * POST /api/auth/signup
 *
 * Creates the auth account and its `customers` row, then leaves the caller
 * signed in — the auth cookies are written by authActions().
 *
 * Phone uniqueness is checked with the admin client on purpose. RLS lets a
 * customer see only their own row, so a scoped or anonymous client asking
 * "is this phone taken?" always gets "no" and the real collision would only
 * surface as a constraint violation after the auth user already existed.
 */
export async function POST(request: Request) {
  let body: { phone?: string; password?: string; name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const password = body.password ?? "";
  const email = body.email?.trim() ?? "";

  if (!name) return Response.json({ error: "Please enter your full name." }, { status: 400 });
  if (!isValidPhone(phone)) {
    return Response.json({ error: "Enter a phone like 03XX-XXXXXXX." }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: "That email does not look right." }, { status: 400 });
  }

  const admin = insforgeAdmin();
  const normalisedPhone = formatPhone(phone);

  const { data: taken } = await admin.database
    .from("customers")
    .select("id")
    .eq("phone", normalisedPhone)
    .maybeSingle();

  if (taken) {
    return Response.json(
      { error: "That phone number is already registered.", code: "PHONE_TAKEN" },
      { status: 409 }
    );
  }

  const cookieStore = await cookies();
  const { data, error } = await authActions(cookieStore).signUp({
    email: phoneToEmail(phone),
    password,
    name,
  });

  if (error || !data?.user) {
    const status = (error as { statusCode?: number } | null)?.statusCode ?? 503;
    // An existing auth user with no customers row lands here.
    const message =
      status === 409
        ? "That phone number is already registered."
        : "Could not create your account. Please try again.";
    return Response.json({ error: message }, { status: status === 409 ? 409 : 503 });
  }

  const authId = data.user.id;

  const { data: inserted, error: profileError } = await admin.database
    .from("customers")
    .insert([
      {
        auth_id: authId,
        full_name: name,
        phone: normalisedPhone,
        email: email || null,
      },
    ])
    .select();

  if (profileError || !inserted) {
    // Don't leave a usable session pointing at a customer that doesn't exist.
    await authActions(cookieStore).signOut().catch(() => {});
    console.error(
      "[auth] profile insert failed after signup:",
      (profileError as { message?: string } | null)?.message ?? profileError
    );
    return Response.json(
      { error: "We could not finish setting up your account. Please try again." },
      { status: 503 }
    );
  }

  const customer = toCustomer(
    (inserted as unknown[])[0] as Parameters<typeof toCustomer>[0]
  );

  // Read back through the scoped client so the response reflects what this
  // session can actually see.
  const scoped = insforgeServer(cookieStore);
  const { data: check } = await scoped.auth.getCurrentUser();

  return Response.json({
    user: { id: authId, name, email: check?.user?.email ?? phoneToEmail(phone) },
    customer,
  });
}
