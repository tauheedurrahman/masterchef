import { insforgeAdmin } from "@/lib/insforge";

export type OfferInput = {
  code?: string;
  title?: string;
  description?: string | null;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  min_order?: number;
  max_uses?: number | null;
  members_only?: boolean;
  active?: boolean;
  expires_at?: string | null;
};

/** Codes are typed by customers at checkout, so they are stored upper-case. */
export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateOffer(body: OfferInput, { partial = false } = {}): string | null {
  if (!partial || body.code !== undefined) {
    const code = normaliseCode(body.code ?? "");
    if (!code) return "Code is required.";
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      return "Code must be 3–24 characters: letters, numbers, - or _.";
    }
  }
  if (!partial || body.title !== undefined) {
    if (!body.title?.trim()) return "Title is required.";
  }
  if (!partial || body.discount_type !== undefined) {
    if (body.discount_type !== "percentage" && body.discount_type !== "fixed") {
      return "Type must be percentage or fixed.";
    }
  }
  if (!partial || body.discount_value !== undefined) {
    const v = Number(body.discount_value);
    if (!Number.isFinite(v) || v <= 0) return "Value must be greater than 0.";
    // A percentage over 100 would make the order total negative.
    if (body.discount_type === "percentage" && v > 100) {
      return "A percentage discount cannot exceed 100.";
    }
  }
  if (body.min_order !== undefined) {
    const m = Number(body.min_order);
    if (!Number.isFinite(m) || m < 0) return "Minimum order must be 0 or more.";
  }
  if (body.max_uses !== undefined && body.max_uses !== null) {
    const m = Number(body.max_uses);
    if (!Number.isFinite(m) || m < 1) return "Max uses must be 1 or more, or blank for unlimited.";
  }
  if (body.expires_at) {
    if (Number.isNaN(new Date(body.expires_at).getTime())) return "Expiry date is not valid.";
  }
  return null;
}

/** GET /api/admin/offers — every offer, active or not. */
export async function GET() {
  const { data, error } = await insforgeAdmin()
    .database.from("offers")
    .select()
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin] offers read failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not load offers." }, { status: 503 });
  }
  return Response.json({ offers: data ?? [] });
}

/** POST /api/admin/offers — create. */
export async function POST(request: Request) {
  let body: OfferInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const problem = validateOffer(body);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const db = insforgeAdmin();
  const code = normaliseCode(body.code!);

  const { data: clash } = await db.database
    .from("offers")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (clash) {
    return Response.json({ error: `The code "${code}" is already in use.` }, { status: 409 });
  }

  const { data, error } = await db.database
    .from("offers")
    .insert([
      {
        code,
        title: body.title!.trim(),
        description: body.description?.trim() || null,
        discount_type: body.discount_type,
        discount_value: Number(body.discount_value),
        min_order: Number(body.min_order ?? 0),
        max_uses: body.max_uses == null || body.max_uses === undefined ? null : Number(body.max_uses),
        members_only: !!body.members_only,
        active: body.active !== false,
        expires_at: body.expires_at || null,
      },
    ])
    .select();

  if (error) {
    console.error("[admin] offer create failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not create this offer." }, { status: 503 });
  }
  return Response.json({ ok: true, offer: (data as unknown[])?.[0] }, { status: 201 });
}
