"use client";

import { usePathname } from "next/navigation";
import { PhoneIcon, PinIcon } from "./Icons";
import { SITE } from "@/lib/site";

/**
 * The footer's address and phone blocks.
 *
 * Split out of <Footer> so the footer itself stays a server component: this is
 * the only part of it that needs to know the current route. /menu and the
 * account area are task screens — people there are picking food or checking an
 * order, not looking up where the restaurant is — so the shop details are
 * dropped on those. Every other page, /contact and /about included, keeps them.
 */
function hidden(pathname: string): boolean {
  return (
    pathname === "/menu" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  );
}

export default function FooterVisitInfo() {
  const pathname = usePathname();
  if (hidden(pathname)) return null;

  return (
    <>
      <div className="info-block" style={{ borderBottom: 0, paddingBottom: 8 }}>
        <span className="info-block__icon">
          <PinIcon size={18} />
        </span>
        <div>
          <h3>Visit us</h3>
          <p>{SITE.address}</p>
        </div>
      </div>

      <div className="info-block" style={{ borderBottom: 0, paddingTop: 0 }}>
        <span className="info-block__icon">
          <PhoneIcon size={18} />
        </span>
        <div>
          <h3>Call to order</h3>
          <p>
            {SITE.phones.map((p, i) => (
              <span key={p}>
                <a href={`tel:${SITE.phoneTel[i]}`}>{p}</a>
                {i === 0 ? "  ·  " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>
    </>
  );
}
