import { insforgeAdmin } from "@/lib/insforge";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  total: number;
  items: { name: string; quantity: number; lineTotal: number }[] | string;
  created_at: string;
};

/** GET /api/admin/stats — today's numbers plus the recent order feed. */
export async function GET() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const db = insforgeAdmin();

  const [todayRes, recentRes] = await Promise.all([
    db.database
      .from("orders")
      .select("id, order_number, status, customer_name, total, items, created_at")
      .gte("created_at", startOfToday.toISOString()),
    db.database
      .from("orders")
      .select("id, order_number, status, customer_name, total, items, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (todayRes.error || recentRes.error) {
    const err = todayRes.error ?? recentRes.error;
    console.error("[admin] stats failed:", err?.message ?? JSON.stringify(err));
    return Response.json({ error: "Could not load stats." }, { status: 503 });
  }

  const today = (todayRes.data ?? []) as OrderRow[];
  // Cancelled orders shouldn't inflate revenue.
  const billable = today.filter((o) => o.status !== "cancelled");
  const revenue = billable.reduce((sum, o) => sum + (o.total ?? 0), 0);

  const byStatus: Record<string, number> = {
    new: 0, confirmed: 0, preparing: 0, out_for_delivery: 0, delivered: 0, cancelled: 0,
  };
  for (const o of today) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

  // Top sellers by units sold today.
  const tally = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of billable) {
    const items = Array.isArray(o.items) ? o.items : JSON.parse(String(o.items || "[]"));
    for (const line of items as { name: string; quantity: number; lineTotal: number }[]) {
      const entry = tally.get(line.name) ?? { name: line.name, qty: 0, revenue: 0 };
      entry.qty += line.quantity ?? 0;
      entry.revenue += line.lineTotal ?? 0;
      tally.set(line.name, entry);
    }
  }
  const topItems = [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return Response.json({
    today: {
      orders: today.length,
      revenue,
      averageOrderValue: billable.length ? Math.round(revenue / billable.length) : 0,
    },
    byStatus,
    topItems,
    recent: recentRes.data ?? [],
  });
}
