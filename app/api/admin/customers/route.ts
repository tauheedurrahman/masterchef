import { insforgeAdmin } from "@/lib/insforge";

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  area: string | null;
  city: string | null;
  loyalty_points: number | null;
  total_orders: number | null;
  total_spent: number | null;
  created_at: string;
};

type OrderAgg = { customer_id: string | null; total: number | null; status: string };

/**
 * GET /api/admin/customers
 *
 * `customers` carries denormalised total_orders / total_spent counters that
 * checkout maintains. Those are the source of truth for loyalty, but they only
 * start moving once an order is placed through the logged-in flow, so the
 * counts are also derived live from `orders` here and returned alongside.
 * Where the two disagree the live figure is the honest one to show an admin.
 *
 * Cancelled orders count toward neither.
 */
export async function GET() {
  const db = insforgeAdmin();

  const [customersRes, ordersRes] = await Promise.all([
    db.database
      .from("customers")
      .select("id, full_name, phone, email, area, city, loyalty_points, total_orders, total_spent, created_at")
      .order("created_at", { ascending: false }),
    db.database.from("orders").select("customer_id, total, status"),
  ]);

  if (customersRes.error) {
    const err = customersRes.error;
    console.error("[admin] customers read failed:", err.message ?? JSON.stringify(err));
    return Response.json({ error: "Could not load customers." }, { status: 503 });
  }

  // A failed orders read shouldn't blank the whole page — fall back to the
  // stored counters and still render the list.
  const orders = (ordersRes.error ? [] : ((ordersRes.data ?? []) as OrderAgg[])).filter(
    (o) => o.status !== "cancelled"
  );

  const live = new Map<string, { count: number; spent: number }>();
  for (const o of orders) {
    if (!o.customer_id) continue; // guest order
    const entry = live.get(o.customer_id) ?? { count: 0, spent: 0 };
    entry.count += 1;
    entry.spent += o.total ?? 0;
    live.set(o.customer_id, entry);
  }

  const customers = ((customersRes.data ?? []) as CustomerRow[]).map((c) => {
    const agg = live.get(c.id);
    return {
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      area: c.area,
      city: c.city,
      loyalty_points: c.loyalty_points ?? 0,
      orders: agg?.count ?? c.total_orders ?? 0,
      spent: agg?.spent ?? c.total_spent ?? 0,
      created_at: c.created_at,
    };
  });

  return Response.json({ customers, total: customers.length });
}
