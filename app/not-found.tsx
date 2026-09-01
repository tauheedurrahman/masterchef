import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="container">
      <div className="confirm">
        <span className="eyebrow eyebrow--red">404</span>
        <h1>This page is off the menu</h1>
        <p className="lede" style={{ marginInline: "auto" }}>
          The link you followed does not exist — but the fryers are still on.
        </p>
        <div className="confirm__actions" style={{ marginTop: 32 }}>
          <Link href="/menu" className="btn">
            Browse the menu <ArrowRightIcon size={16} />
          </Link>
          <Link href="/" className="btn btn--ghost">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
