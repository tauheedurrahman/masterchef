"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * Sidebar + content frame. The login page renders bare (it has no session
 * yet, so a nav to protected pages would just bounce).
 *
 * The "new orders" badge is polled here rather than in the orders page so the
 * count is visible from anywhere in the admin.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);

  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) return;
    let alive = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/admin/orders?status=new", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (alive) setNewCount(json.total ?? 0);
      } catch {
        /* offline or signed out — the badge just stops updating */
      }
    };

    poll();
    const id = window.setInterval(poll, 20_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [isLogin, pathname]);

  if (isLogin) return <div className="adm adm--login">{children}</div>;

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="adm">
      <aside className="adm__side">
        <div className="adm__brand">
          <Logo width={30} height={30} />
          <div>
            <b>Master Chef</b>
            <span>Admin</span>
          </div>
        </div>

        {LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className="adm__nav" data-active={active}>
              <span>{l.label}</span>
              {l.label === "Orders" && newCount > 0 && (
                <span className="adm__badge">{newCount > 99 ? "99+" : newCount}</span>
              )}
            </Link>
          );
        })}

        <form action={signOut}>
          <button type="submit" className="adm__signout">
            Sign out
          </button>
        </form>
      </aside>

      <main className="adm__main">{children}</main>
    </div>
  );
}
