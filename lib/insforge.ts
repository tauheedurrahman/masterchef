/**
 * InsForge SDK clients.
 *
 * Four entry points, because "which client" depends on who is asking:
 *
 *   insforgeBrowser()  — browser. Reads the session from the auth cookies the
 *                        server set. Its `auth` is deliberately reduced by the
 *                        SDK to getCurrentUser/getProfile, so sign-in and
 *                        sign-up CANNOT happen here; they go through
 *                        /api/auth/* and authActions() below.
 *
 *   insforgeServer()   — route handlers and server components. Reads the same
 *                        cookies, so queries run as the signed-in customer with
 *                        RLS applied. This is what makes an unauthenticated
 *                        request to /api/auth/* fall out as a 401.
 *
 *   authActions()      — route handlers only. signUp / signIn / signOut. Writes
 *                        the httpOnly auth cookies onto the response and strips
 *                        the tokens out of the returned data, so no access or
 *                        refresh token is ever handed to JavaScript.
 *
 *   insforgeAdmin()    — project admin key. Bypasses RLS, so it must NEVER be
 *                        imported into a client component. Used where the app
 *                        legitimately needs to see past a customer's own rows:
 *                        the storefront's menu reads, order pricing, and the
 *                        whole admin dashboard.
 *
 * Keys come from .env.local (git-ignored). Nothing here is hardcoded.
 */

import { createAdminClient } from "@insforge/sdk";
import {
  createAuthActions,
  createBrowserClient,
  createServerClient,
  type CookieStore,
} from "@insforge/sdk/ssr";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

if (!baseUrl) {
  throw new Error(
    "NEXT_PUBLIC_INSFORGE_URL is not set. Add it to .env.local — see AGENTS.md."
  );
}

export const INSFORGE_URL = baseUrl;

/* ------------------------------------------------------------------ *
 * Browser
 * ------------------------------------------------------------------ */

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Cookie-backed browser client. One instance per tab. */
export function insforgeBrowser() {
  browserClient ??= createBrowserClient({ baseUrl: baseUrl!, anonKey });
  return browserClient;
}

/* ------------------------------------------------------------------ *
 * Server
 * ------------------------------------------------------------------ */

/**
 * Server-side client scoped to the request's cookies.
 *
 * Pass Next's cookie store: `insforgeServer(await cookies())`. With no session
 * cookie the client is simply anonymous — RLS then hides every customer row,
 * which is exactly how the /api/auth/* routes detect "not signed in".
 */
export function insforgeServer(cookies: Pick<CookieStore, "get">) {
  return createServerClient({ baseUrl: baseUrl!, anonKey, cookies });
}

/**
 * Auth mutations for route handlers.
 *
 * `requestCookies` reads the incoming session; `responseCookies` is where the
 * refreshed session is written. In a Next route handler both are the same
 * `await cookies()` store.
 */
export function authActions(cookies: CookieStore) {
  return createAuthActions({
    baseUrl: baseUrl!,
    anonKey,
    requestCookies: cookies,
    responseCookies: cookies,
  });
}

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

/**
 * Admin client. Server-side only — the API key bypasses RLS.
 * Created lazily so a missing key is a clear error at the call site rather
 * than a crash while the module graph is being built.
 */
export function insforgeAdmin() {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "INSFORGE_API_KEY is not set. Add it to .env.local — it must never be NEXT_PUBLIC_."
    );
  }
  return createAdminClient({ baseUrl: baseUrl!, apiKey });
}
