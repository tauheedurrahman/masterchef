import bcrypt from "bcryptjs";
import { createClient } from "@insforge/sdk";
import { requireCustomer } from "../_lib/session";
import { phoneToEmail } from "@/lib/auth";
import { INSFORGE_URL } from "@/lib/insforge";

/**
 * POST /api/auth/change-password
 *
 * Two steps, and the first one matters: the current password is verified by
 * actually signing in with it. Without that, anyone who got hold of a live
 * session cookie could lock the real owner out of their account.
 *
 * That check runs on a throwaway client with its own memory-only token store,
 * so a wrong guess cannot disturb the cookies of the session making the
 * request. The update itself goes through public.set_my_password(), a
 * SECURITY DEFINER function keyed on auth.uid() — see the migration for why
 * the auth table has to be touched at all.
 */
export async function POST(request: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const current = body.currentPassword ?? "";
  const next = body.newPassword ?? "";

  if (!current) {
    return Response.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (next.length < 6) {
    return Response.json(
      { error: "Your new password must be at least 6 characters." },
      { status: 400 }
    );
  }
  if (next === current) {
    return Response.json(
      { error: "That is already your password." },
      { status: 400 }
    );
  }

  // Verify the current password without touching this request's cookies.
  const probe = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });
  const { data: check, error: checkError } = await probe.auth.signInWithPassword({
    email: phoneToEmail(auth.customer.phone),
    password: current,
  });

  if (checkError || !check?.user) {
    return Response.json({ error: "Your current password is wrong." }, { status: 401 });
  }
  await probe.auth.signOut().catch(() => {});

  const hash = await bcrypt.hash(next, 10);

  const { error } = await auth.db.database.rpc("set_my_password", { new_hash: hash });
  if (error) {
    console.error(
      "[auth] password change failed:",
      (error as { message?: string }).message ?? JSON.stringify(error)
    );
    return Response.json({ error: "Could not change your password." }, { status: 503 });
  }

  return Response.json({ ok: true });
}
