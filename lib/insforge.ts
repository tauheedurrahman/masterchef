/**
 * InsForge SDK clients.
 *
 * Two of them, deliberately:
 *
 *   insforge       — anon key. Safe anywhere. Row Level Security applies, so it
 *                    only ever sees `available = true` menu rows and can insert
 *                    an order but never read one back.
 *
 *   insforgeAdmin  — project admin key. Bypasses RLS, so it must NEVER be
 *                    imported into a client component. Every call site is a
 *                    route handler or a server-only module.
 *
 * Keys come from .env.local (git-ignored). Nothing here is hardcoded.
 */

import { createAdminClient, createClient } from "@insforge/sdk";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

if (!baseUrl) {
  throw new Error(
    "NEXT_PUBLIC_INSFORGE_URL is not set. Add it to .env.local — see .env.local.example."
  );
}

/** Public client. Anon key, RLS enforced. */
export const insforge = createClient({ baseUrl, anonKey });

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

export const INSFORGE_URL = baseUrl;
