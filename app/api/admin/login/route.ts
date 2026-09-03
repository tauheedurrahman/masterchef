import bcrypt from "bcryptjs";
import { insforgeAdmin } from "@/lib/insforge";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieOptions,
  createSessionToken,
} from "../_lib/session";

/** POST /api/admin/login — username + password against admin_users. */
export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  if (!username || !password) {
    return Response.json({ error: "Username and password are required." }, { status: 400 });
  }

  const { data, error } = await insforgeAdmin()
    .database.from("admin_users")
    .select("id, username, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("[admin] login lookup failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Sign-in is unavailable right now." }, { status: 503 });
  }

  const row = data as { username: string; password_hash: string } | null;
  // Compare against a dummy hash when the user is missing so a wrong username
  // and a wrong password take the same time to answer.
  const hash = row?.password_hash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu";
  const ok = await bcrypt.compare(password, hash);

  if (!row || !ok) {
    return Response.json({ error: "Wrong username or password." }, { status: 401 });
  }

  const token = await createSessionToken(row.username);
  const res = Response.json({ ok: true, username: row.username });
  res.headers.append(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE))
  );
  return res;
}

/** Minimal cookie serializer — avoids pulling in a dependency for one header. */
function serializeCookie(
  name: string,
  value: string,
  opts: ReturnType<typeof cookieOptions>
): string {
  const parts = [`${name}=${value}`, `Path=${opts.path}`, `Max-Age=${opts.maxAge}`, `SameSite=Lax`];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}
