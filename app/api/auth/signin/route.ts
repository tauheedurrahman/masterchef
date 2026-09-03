import { cookies } from "next/headers";
import { authActions, insforgeAdmin } from "@/lib/insforge";
import { isValidPhone, phoneToEmail, toCustomer } from "@/lib/auth";

/**
 * POST /api/auth/signin
 *
 * On success the auth cookies are written by authActions and the caller gets
 * back the profile — never a token.
 */
export async function POST(request: Request) {
  let body: { phone?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const phone = body.phone?.trim() ?? "";
  const password = body.password ?? "";

  if (!isValidPhone(phone)) {
    return Response.json({ error: "Enter a phone like 03XX-XXXXXXX." }, { status: 400 });
  }
  if (!password) {
    return Response.json({ error: "Please enter your password." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const { data, error } = await authActions(cookieStore).signInWithPassword({
    email: phoneToEmail(phone),
    password,
  });

  if (error || !data?.user) {
    // Deliberately one message for "no such phone" and "wrong password": the
    // login form should not confirm which numbers are registered.
    return Response.json({ error: "Invalid phone or password." }, { status: 401 });
  }

  const authId = data.user.id;

  // The customers row is read with the admin client rather than the scoped one:
  // the response cookies have been written, but this request's cookie jar is
  // the one it was created with, so a scoped read here can race the refresh.
  const { data: row } = await insforgeAdmin()
    .database.from("customers")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!row) {
    await authActions(cookieStore).signOut().catch(() => {});
    return Response.json(
      { error: "This account has no profile. Please contact us." },
      { status: 409 }
    );
  }

  const customer = toCustomer(row as Parameters<typeof toCustomer>[0]);
  return Response.json({
    user: { id: authId, name: customer.fullName, email: data.user.email },
    customer,
  });
}
