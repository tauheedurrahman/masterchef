"use client";

/**
 * Account control in the navbar.
 *
 * Signed out it is just a link to /login, indistinguishable from before.
 * Signed in the icon carries a small green dot and opens a dropdown.
 *
 * While `loading` is true it renders as the plain link. That is deliberate: the
 * server cannot know who is signed in, so a signed-in visitor briefly sees the
 * logged-out icon on first paint. Rendering the dropdown state early would
 * instead cause a hydration mismatch on every page load.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PinIcon, ScooterIcon, TagIcon, UserIcon } from "./Icons";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/store";

function SignOutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export const ACCOUNT_LINKS = [
  { href: "/profile", label: "My Profile", Icon: UserIcon },
  { href: "/profile/orders", label: "My Orders", Icon: ScooterIcon },
  { href: "/profile/addresses", label: "My Addresses", Icon: PinIcon },
  { href: "/profile/offers", label: "My Offers", Icon: TagIcon },
];

export default function AccountMenu() {
  const { user, customer, loading, isAuthenticated, signOut } = useAuth();
  const { notify } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading || !isAuthenticated) {
    return (
      <Link href="/login" className="icon-btn" aria-label="Sign in or create an account">
        <UserIcon />
      </Link>
    );
  }

  const firstName = (customer?.fullName ?? user?.name ?? "there").split(" ")[0];

  async function onSignOut() {
    setOpen(false);
    await signOut();
    notify("Signed out.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="acct" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn acct__btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Account menu for ${firstName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <UserIcon />
        <span className="acct__dot" aria-hidden="true" />
      </button>

      {open && (
        <div className="acct__menu" id={menuId} role="menu">
          <p className="acct__hello">
            Hello, <b>{firstName}</b>!
          </p>
          <span className="acct__rule" />

          {ACCOUNT_LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="acct__link"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}

          <span className="acct__rule" />
          <button type="button" className="acct__link acct__link--out" role="menuitem" onClick={onSignOut}>
            <SignOutIcon />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
