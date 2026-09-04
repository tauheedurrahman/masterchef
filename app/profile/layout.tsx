import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { insforgeServer } from "@/lib/insforge";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

/**
 * Real guard for the whole /profile area.
 *
 * Middleware already bounced anyone with no session cookie, but a cookie is
 * not a session: it can be expired, revoked or forged. This resolves it against
 * InsForge on the server, so an invalid token lands on the login page rather
 * than on an empty profile that 401s every fetch it makes.
 *
 * Being a server check, there is also no flash of protected content.
 */
export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, error } = await insforgeServer(await cookies()).auth.getCurrentUser();

  if (error || !data?.user) {
    redirect("/login?redirect=%2Fprofile");
  }

  return <div className="profile">{children}</div>;
}
