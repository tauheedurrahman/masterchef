import { insforgeAdmin } from "@/lib/insforge";
import { formatPhone, isValidPhone } from "@/lib/auth";

/**
 * GET /api/auth/phone-available?phone=0345-0676764
 *
 * Signup's on-blur check, so someone does not fill in a whole form only to be
 * told the number is taken. Needs the admin client: RLS shows a signed-out
 * visitor no `customers` rows at all, so a scoped query would report every
 * number as free.
 *
 * This does confirm whether a given number has an account, which is inherent
 * to the check. It is kept as narrow as possible — one boolean, no name, no
 * profile, and nothing at all for a malformed number.
 */
export async function GET(request: Request) {
  const phone = new URL(request.url).searchParams.get("phone") ?? "";

  if (!isValidPhone(phone)) {
    return Response.json({ error: "Enter a phone like 03XX-XXXXXXX." }, { status: 400 });
  }

  const { data, error } = await insforgeAdmin()
    .database.from("customers")
    .select("id")
    .eq("phone", formatPhone(phone))
    .maybeSingle();

  if (error) {
    console.error("[auth] phone check failed:", error.message ?? JSON.stringify(error));
    return Response.json({ error: "Could not check that number." }, { status: 503 });
  }

  return Response.json({ available: !data });
}
