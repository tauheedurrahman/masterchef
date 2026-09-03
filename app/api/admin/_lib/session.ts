/**
 * Admin session cookie.
 *
 * A signed, self-contained token — `<payload>.<hmac>` — so middleware can
 * verify it at the edge without a database round trip on every request.
 * HMAC-SHA256 via WebCrypto, which runs in both the Node and Edge runtimes.
 *
 * This is deliberately not a JWT library: one cookie, one claim (username),
 * one expiry. Adding a dependency to sign 40 bytes would be overkill.
 */

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  username: string;
  exp: number; // unix seconds
}

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set — add it to .env.local.");
  return s;
}

const b64url = {
  encode(bytes: Uint8Array): string {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(str: string): Uint8Array {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  },
};

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url.encode(new Uint8Array(sig));
}

/** Builds a signed session token for `username`. */
export async function createSessionToken(username: string): Promise<string> {
  const payload: SessionPayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const body = b64url.encode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(body)}`;
}

/**
 * Returns the payload if the token is well-formed, correctly signed and
 * unexpired — otherwise null. Comparison is length-safe and constant-time-ish;
 * the signature is recomputed rather than parsed from user input.
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  let expected: string;
  try {
    expected = await sign(body);
  } catch {
    return null;
  }
  if (expected.length !== sig.length) return null;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64url.decode(body))) as SessionPayload;
    if (!payload?.username || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Cookie options shared by login (set) and logout (clear). */
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
