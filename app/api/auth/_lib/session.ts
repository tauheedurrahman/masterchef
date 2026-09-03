/**
 * Session guard for the customer-facing /api/auth/* routes.
 *
 * Every one of them starts with `requireCustomer()`. It resolves the InsForge
 * session from the request's auth cookies — there is no header or body field a
 * caller could forge — and returns either the customer or a ready-made 401.
 *
 * Two clients are in play on purpose:
 *
 *   db     — scoped to the caller. RLS means it can only ever see that
 *            customer's own rows, so a handler that forgets a filter still
 *            cannot leak someone else's data.
 *   admin  — bypasses RLS. Only for the things a customer legitimately cannot
 *            do for themselves: reading menu prices, writing loyalty totals,
 *            recording a redemption. Never used to read customer data that the
 *            scoped client could have read.
 */

import { cookies } from "next/headers";
import { insforgeServer } from "@/lib/insforge";
import { toCustomer, type Customer } from "@/lib/auth";

export interface AuthedCustomer {
  authId: string;
  customer: Customer;
  db: ReturnType<typeof insforgeServer>;
}

export const UNAUTHORIZED = () =>
  Response.json({ error: "Not signed in." }, { status: 401 });

/**
 * Resolves the signed-in customer, or null.
 *
 * Null covers three cases that all mean the same thing to a caller: no cookie,
 * an expired or invalid token, and a valid auth user with no `customers` row
 * behind it (a signup that half-failed). None of them should see data.
 */
export async function getAuthedCustomer(): Promise<AuthedCustomer | null> {
  const cookieStore = await cookies();
  const db = insforgeServer(cookieStore);

  const { data, error } = await db.auth.getCurrentUser();
  if (error || !data?.user) return null;

  const authId = data.user.id;

  const { data: row, error: rowError } = await db.database
    .from("customers")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (rowError || !row) return null;

  return { authId, customer: toCustomer(row as Parameters<typeof toCustomer>[0]), db };
}

/**
 * `const auth = await requireCustomer(); if (!auth.ok) return auth.response;`
 *
 * Returning the response rather than throwing keeps the 401 shape identical
 * across every route without a try/catch in each one.
 */
export async function requireCustomer(): Promise<
  { ok: true; auth: AuthedCustomer } | { ok: false; response: Response }
> {
  const auth = await getAuthedCustomer();
  if (!auth) return { ok: false, response: UNAUTHORIZED() };
  return { ok: true, auth };
}
