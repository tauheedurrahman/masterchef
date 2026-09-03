import { SESSION_COOKIE } from "../_lib/session";

/** POST /api/admin/logout — clears the session cookie. */
export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return res;
}
