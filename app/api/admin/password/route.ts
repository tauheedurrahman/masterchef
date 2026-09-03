import bcrypt from "bcryptjs";
import { insforgeAdmin } from "@/lib/insforge";
import { SESSION_COOKIE, verifySessionToken } from "../_lib/session";

/** POST /api/admin/password — change the password of the signed-in admin. */
export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(/;\s*/)
    .find((c) => c.startsWith(SESSION_COOKIE + "="))
    ?.slice(SESSION_COOKIE.length + 1);

  const session = await verifySessionToken(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const current = body.currentPassword ?? "";
  const next = body.newPassword ?? "";
  if (next.length < 8) {
    return Response.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const db = insforgeAdmin();
  const { data, error } = await db.database
    .from("admin_users")
    .select("id, password_hash")
    .eq("username", session.username)
    .maybeSingle();

  if (error || !data) {
    return Response.json({ error: "Could not load your account." }, { status: 503 });
  }

  const row = data as { id: string; password_hash: string };
  if (!(await bcrypt.compare(current, row.password_hash))) {
    return Response.json({ error: "Current password is wrong." }, { status: 401 });
  }

  const hash = await bcrypt.hash(next, 10);
  const { error: updateError } = await db.database
    .from("admin_users")
    .update({ password_hash: hash })
    .eq("id", row.id);

  if (updateError) {
    console.error(
      "[admin] password change failed:",
      updateError.message ?? JSON.stringify(updateError)
    );
    return Response.json({ error: "Could not change your password." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
