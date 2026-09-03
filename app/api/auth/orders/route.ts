import { requireCustomer } from "../_lib/session";

const PAGE_SIZE = 10;

/**
 * GET /api/auth/orders?page=0 — the caller's order history, newest first.
 *
 * Read through the scoped client, so the own_read_orders policy is what
 * actually enforces ownership; the customer_id filter below is for paging, not
 * for security.
 */
export async function GET(request: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const page = Math.max(0, Number(new URL(request.url).searchParams.get("page") ?? 0) || 0);
  const from = page * PAGE_SIZE;

  const { data, error, count } = await auth.db.database
    .from("orders")
    .select("*", { count: "exact" })
    .eq("customer_id", auth.customer.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error("[auth] orders read failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not load your orders." }, { status: 503 });
  }

  const orders = (data ?? []) as unknown[];
  const total = count ?? orders.length;

  return Response.json({
    orders,
    page,
    pageSize: PAGE_SIZE,
    total,
    hasMore: from + orders.length < total,
  });
}
