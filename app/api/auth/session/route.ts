import { getAuthedCustomer } from "../_lib/session";

/**
 * GET /api/auth/session
 *
 * The client's source of truth for "who am I". Returns 200 with a null user
 * when signed out rather than 401 — being logged out is a normal state for
 * this endpoint, not an error, and the navbar polls it on every mount.
 */
export async function GET() {
  const auth = await getAuthedCustomer();
  if (!auth) return Response.json({ user: null, customer: null });

  return Response.json({
    user: { id: auth.authId, name: auth.customer.fullName, email: auth.customer.email },
    customer: auth.customer,
  });
}
