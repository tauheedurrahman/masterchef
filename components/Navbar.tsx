"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SafeImage from "./SafeImage";
import Logo from "./Logo";
import {
  ArrowRightIcon,
  CartIcon,
  CloseIcon,
  SearchIcon,
} from "./Icons";
import { useCart } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { money } from "@/lib/format";
import { ANNOUNCEMENTS, SITE } from "@/lib/site";
import AccountMenu, { ACCOUNT_LINKS } from "./AccountMenu";

/** Trimmed item shape the layout hands down for instant search suggestions. */
export interface SearchIndexItem {
  id: string;
  name: string;
  category: string;
  image: string;
  from: number;
}

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/deals", label: "Deals" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar({ index }: { index: SearchIndexItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count, hydrated, notify } = useCart();
  const { isAuthenticated, customer, loading: authLoading, signOut } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /* Announcement bar rotation */
  const [announceIdx, setAnnounceIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setAnnounceIdx((i) => (i + 1) % ANNOUNCEMENTS.length),
      4200
    );
    return () => window.clearInterval(id);
  }, []);

  /* Nav shadow on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close everything on navigation */
  useEffect(() => {
    setSearchOpen(false);
    setDrawerOpen(false);
  }, [pathname]);

  /* Lock body scroll + wire Escape while an overlay is open */
  useEffect(() => {
    const open = searchOpen || drawerOpen;
    document.body.classList.toggle("no-scroll", open);
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [searchOpen, drawerOpen]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const suggestions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return index
      .filter((i) => `${i.name} ${i.category}`.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [q, index]);

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const term = q.trim();
      if (!term) return;
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [q, router]
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Announcement bar */}
      <div className="announce">
        <div className="announce__track">
          {ANNOUNCEMENTS.map((msg, i) => (
            <span
              key={msg}
              className="announce__msg"
              data-active={i === announceIdx ? "true" : "false"}
              aria-hidden={i !== announceIdx}
            >
              {msg}
            </span>
          ))}
        </div>
      </div>

      <header className="nav" data-scrolled={scrolled ? "true" : "false"}>
        <div className="container nav__inner">
          <Link
            href="/"
            className="logo"
            style={{ gap: 8 }}
            aria-label={`${SITE.name} home`}
          >
            <Logo width={36} height={36} />
            <span className="logo__text">
              <span className="logo__name">Master Chef</span>
              <span className="logo__sub">Hot &amp; Delicious</span>
            </span>
          </Link>

          <nav className="nav__links" aria-label="Primary">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="nav__link"
                data-active={isActive(l.href) ? "true" : "false"}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <span className="nav__spacer" />

          <div className="nav__actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search the menu"
            >
              <SearchIcon />
            </button>

            <Link href="/cart" className="icon-btn" aria-label="View cart">
              <CartIcon />
              {/* Rendered only after the cart hydrates from localStorage,
                  so SSR and first client paint always agree. */}
              {hydrated && count > 0 && (
                <span className="cart-badge">{count > 99 ? "99+" : count}</span>
              )}
            </Link>

            <AccountMenu />

            <button
              type="button"
              className="hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------- Search overlay ------------------------- */}
      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search">
          <div className="search-overlay__head">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <CloseIcon size={22} />
            </button>
          </div>

          <form className="search-overlay__form" onSubmit={submitSearch} role="search">
            <div className="search-overlay__field">
              <SearchIcon size={26} />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search zinger, shawarma, fries…"
                aria-label="Search the menu"
                autoComplete="off"
              />
              {q && (
                <button type="button" className="icon-btn" onClick={() => setQ("")} aria-label="Clear">
                  <CloseIcon size={18} />
                </button>
              )}
            </div>
          </form>

          {suggestions.length > 0 ? (
            <div className="search-suggestions">
              {suggestions.map((s) => (
                <Link key={s.id} href={`/item/${s.id}`} className="suggestion">
                  <span className="suggestion__img">
                    <SafeImage src={s.image} alt="" fill sizes="46px" style={{ objectFit: "cover" }} />
                  </span>
                  <span className="suggestion__meta">
                    <span className="suggestion__name">{s.name}</span>
                    <span className="suggestion__cat">{s.category.replace("-", " ")}</span>
                  </span>
                  <span className="price">{money(s.from)}</span>
                </Link>
              ))}
              <button type="button" className="link-arrow" style={{ marginTop: 14, alignSelf: "flex-start" }} onClick={submitSearch}>
                See all results <ArrowRightIcon size={16} />
              </button>
            </div>
          ) : (
            <p className="search-hint">
              {q.trim().length >= 2
                ? "No matches yet — press Enter to search the full menu."
                : "Try “zinger”, “shawarma”, “pizza” or “fries”."}
            </p>
          )}
        </div>
      )}

      {/* ------------------------- Mobile drawer -------------------------- */}
      {drawerOpen && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer__head">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Logo width={28} height={28} />
                <span className="logo__name">Menu</span>
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <CloseIcon size={22} />
              </button>
            </div>

            {isAuthenticated && customer && (
              <p className="drawer__hello">
                Hello, <b>{customer.fullName.split(" ")[0]}</b>!
              </p>
            )}

            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="drawer__link">
                {l.label}
                <ArrowRightIcon size={16} />
              </Link>
            ))}
            <Link href="/cart" className="drawer__link">
              Cart {hydrated && count > 0 ? `(${count})` : ""}
              <ArrowRightIcon size={16} />
            </Link>
            {authLoading ? null : isAuthenticated ? (
              ACCOUNT_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="drawer__link">
                  {l.label}
                  <ArrowRightIcon size={16} />
                </Link>
              ))
            ) : (
              <Link href="/login" className="drawer__link">
                Sign in
                <ArrowRightIcon size={16} />
              </Link>
            )}

            <div className="drawer__foot">
              <span className="eyebrow">Call to order</span>
              {SITE.phones.map((p, i) => (
                <a key={p} href={`tel:${SITE.phoneTel[i]}`} className="drawer__phone">
                  {p}
                </a>
              ))}
              <Link href="/menu" className="btn btn--block" style={{ marginTop: 12 }}>
                Order now
              </Link>
              {isAuthenticated && (
                <button
                  type="button"
                  className="drawer__signout"
                  onClick={async () => {
                    setDrawerOpen(false);
                    await signOut();
                    notify("Signed out.");
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Sign Out
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
