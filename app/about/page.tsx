import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SafeImage from "@/components/SafeImage";
import { ArrowRightIcon } from "@/components/Icons";
import { unsplash } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Master Chef — a fast-food and continental kitchen on Ishrat Cinema Road, Peshawar. Fresh, halal, made to order.",
};

export default function AboutPage() {
  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>About</span>
          </div>
          <span className="eyebrow">{SITE.tagline}</span>
          <h1>About Master Chef</h1>
          <p className="lede">
            A Gulbahar kitchen with a simple rule: nothing goes out that we
            would not eat ourselves.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <Reveal>
            <div
              style={{
                position: "relative",
                aspectRatio: "21 / 9",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                border: "1px solid var(--hairline)",
              }}
            >
              <SafeImage
                src={unsplash("photo-1626645738196-c2a7c87a8f58", 1600)}
                alt="Fried chicken and burgers on the pass at Master Chef"
                fill
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          </Reveal>

          <Reveal className="prose" style={{ marginTop: 48 }}>
            <h2>Where we started</h2>
            <p>
              Master Chef opened on Ishrat Cinema Road with one fryer, one grill
              and a queue that formed before the shutters were fully up. The
              menu was short — a zinger burger, a shawarma, a plate of fries —
              and it was cooked to order, every time.
            </p>
            <p>
              That has not changed. The menu is longer now, with paratha rolls,
              pizza, pasta, chowmein and platters built for a full table, but
              every order still starts when you place it. Nothing sits under a
              heat lamp waiting for a customer.
            </p>

            <h2>How we cook</h2>
            <ul>
              <li>
                Chicken is marinated in-house overnight — never bought
                pre-breaded.
              </li>
              <li>
                Every item is 100% halal, with separate prep areas and separate
                fryers for the spicy line.
              </li>
              <li>
                Sauces, from the garlic mayo to the peri glaze, are mixed in our
                own kitchen each morning.
              </li>
              <li>
                Potatoes are cut and blanched daily, then fried a second time on
                order — that is where the crunch comes from.
              </li>
            </ul>

            <h2 id="delivery">Delivery &amp; pickup</h2>
            <p>
              We deliver across Peshawar. Orders over {" "}
              <strong style={{ color: "var(--accent-warm)" }}>
                Rs {SITE.freeDeliveryOver.toLocaleString("en-US")}
              </strong>{" "}
              ship free; below that a flat Rs {SITE.deliveryFee} applies. Most
              deliveries land in {SITE.etaMinutes}. Prefer to collect? Choose
              pickup at checkout — there is never a fee, and your order is
              usually ready in 15–20 minutes.
            </p>
            <p>
              The kitchen runs late. Two <Link href="/deals#midnight" style={{ color: "var(--accent-warm)" }}>midnight deals</Link>{" "}
              open up after 10:30 PM for the after-hours crowd.
            </p>
          </Reveal>

          <Reveal className="stat-row">
            <div className="stat">
              <b>13</b>
              <span>Value deals</span>
            </div>
            <div className="stat">
              <b>8</b>
              <span>Menu categories</span>
            </div>
            <div className="stat">
              <b>{SITE.etaMinutes}</b>
              <span>Typical delivery</span>
            </div>
          </Reveal>

          <Reveal style={{ marginTop: 48 }}>
            <Link href="/menu" className="btn btn--lg">
              See the full menu <ArrowRightIcon size={17} />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
