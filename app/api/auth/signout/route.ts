import { cookies } from "next/headers";
import { authActions } from "@/lib/insforge";

/** POST /api/auth/signout — clears the auth cookies. */
export async function POST() {
  const cookieStore = await cookies();
  const { error } = await authActions(cookieStore).signOut();

  if (error) {
    // The cookies are cleared by the SDK regardless, so the browser is signed
    // out either way; report success rather than stranding the UI as "signed in".
    console.error("[auth] signOut:", (error as { message?: string }).message ?? error);
  }
  return Response.json({ ok: true });
}
