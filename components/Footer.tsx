import Link from "next/link";
import FooterVisitInfo from "./FooterVisitInfo";
import { CATEGORIES } from "@/lib/data";
import { SITE, WHATSAPP_LINK } from "@/lib/site";
import {
  FacebookIcon,
  InstagramIcon,
  PhoneIcon,
  TikTokIcon,
} from "./Icons";

const COMPANY = [
  { href: "/about", label: "About us" },
  { href: "/deals", label: "Deals & offers" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "My account" },
];

const SUPPORT = [
  { href: "/contact", label: "Order support" },
  { href: "/cart", label: "Your cart" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/about#delivery", label: "Delivery info" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Link href="/" className="logo">
              <span className="logo__mark" aria-hidden="true">
                MC
              </span>
              <span className="logo__text">
                <span className="logo__name">Master Chef</span>
                <span className="logo__sub">Hot &amp; Delicious</span>
              </span>
            </Link>

            <p className="footer__blurb">
              Peshawar&apos;s fast-food and continental kitchen — zingers,
              shawarma, rolls and platters made fresh to order, delivered hot to
              your door.
            </p>

            <div className="socials">
              <a
                className="social"
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Master Chef on Facebook"
              >
                <FacebookIcon />
              </a>
              <a
                className="social"
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Master Chef on Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                className="social"
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Master Chef on TikTok"
              >
                <TikTokIcon />
              </a>
              <a
                className="social"
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Order on WhatsApp"
              >
                <PhoneIcon size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4>Menu</h4>
            <div className="footer__links">
              <Link href="/menu">Full menu</Link>
              {CATEGORIES.slice(0, 5).map((c) => (
                <Link key={c.slug} href={`/menu/${c.slug}`}>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4>Company</h4>
            <div className="footer__links">
              {COMPANY.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4>Support &amp; Legal</h4>
            <div className="footer__links">
              {SUPPORT.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <hr className="hairline" />

        <FooterVisitInfo />

        <div className="footer__bottom">
          <span>
            © {year} {SITE.nameUpper}. All rights reserved.
          </span>
          <span>{SITE.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
