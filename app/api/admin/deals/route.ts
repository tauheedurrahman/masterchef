import { insforgeAdmin } from "@/lib/insforge";

export type DealInput = {
  id?: string;
  name?: string;
  price?: number;
  includes?: string[];
  image?: string | null;
  midnight?: boolean;
  featured?: boolean;
  available?: boolean;
};

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function validateDeal(body: DealInput, { partial = false } = {}): string | null {
  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) return "Name is required.";
  }
  if (!partial || body.price !== undefined) {
    if (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)
      return "Price must be 0 or more.";
  }
  if (body.includes !== undefined && !Array.isArray(body.includes))
    return "Includes must be a list.";
  return null;
}

/** GET /api/admin/deals — every deal, available or not. */
export async function GET() {
  const { data, error } = await insforgeAdmin()
    .database.from("deals")
    .select()
    .order("id", { ascending: true });

  if (error) {
    console.error("[admin] deals read failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not load deals." }, { status: 503 });
  }
  return Response.json({ deals: data ?? [] });
}

/** POST /api/admin/deals — create. */
export async function POST(request: Request) {
  let body: DealInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateDeal(body);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const db = insforgeAdmin();
  const id = body.id?.trim() || slugify(body.name!);

  const { data: clash } = await db.database
    .from("deals")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (clash) {
    return Response.json({ error: `A deal with id "${id}" already exists.` }, { status: 409 });
  }

  const { data, error } = await db.database
    .from("deals")
    .insert([
      {
        id,
        name: body.name!.trim(),
        price: Number(body.price),
        includes: (body.includes ?? []).filter(Boolean),
        image: body.image || null,
        midnight: !!body.midnight,
        featured: !!body.featured,
        available: body.available !== false,
      },
    ])
    .select();

  if (error) {
    console.error("[admin] deal create failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not create this deal." }, { status: 503 });
  }
  return Response.json({ ok: true, deal: (data as unknown[])?.[0] }, { status: 201 });
}
