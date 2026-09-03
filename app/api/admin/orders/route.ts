import { insforgeAdmin } from "@/lib/insforge";

const PAGE_SIZE = 50;
const STATUSES = ["new", "preparing", "out_for_delivery", "delivered", "cancelled"];

/** GET /api/admin/orders?status=new&page=0 — newest first, 50 per page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0) || 0);

  let query = insforgeAdmin()
    .database.from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (status && STATUSES.includes(status)) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin] orders read failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not load orders." }, { status: 503 });
  }

  return Response.json({
    orders: data ?? [],
    total: count ?? (data?.length ?? 0),
    page,
    pageSize: PAGE_SIZE,
  });
}
