import type { Metadata } from "next";
import AdminShell from "./AdminShell";
import { ADMIN_CSS } from "./admin-css";

export const metadata: Metadata = {
  title: "Master Chef — Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin lives in its own visual world: dark sidebar, light content.
 *
 * Styles are injected here rather than added to globals.css so the customer
 * site's stylesheet is untouched. Everything is scoped under `.adm`.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
