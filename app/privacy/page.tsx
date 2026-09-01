import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Master Chef handles the information you give us.",
};

export default function PrivacyPage() {
  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Privacy</span>
          </div>
          <span className="eyebrow">Last updated: January 2026</span>
          <h1>Privacy policy</h1>
        </div>
      </header>

      <section className="section">
        <div className="container container--narrow">
          <div className="prose">
            <p className="lede">
              This site is a demonstration storefront for {SITE.nameUpper}. It
              does not process payments and does not send orders to a kitchen.
              The summary below describes how information would be handled in a
              live deployment.
            </p>

            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Order details</strong> — the items in your cart, your
                chosen sizes and any special instructions you type.
              </li>
              <li>
                <strong>Contact details</strong> — the name and phone number you
                enter at checkout, plus an email address if you choose to give
                one.
              </li>
              <li>
                <strong>Delivery details</strong> — street address, area,
                landmark and any delivery-time note, for delivery orders only.
              </li>
            </ul>

            <h2>Where it is stored</h2>
            <p>
              In this demo, your cart is stored only in your own browser using{" "}
              <code>localStorage</code>. It never leaves your device and is not
              sent to any server. Clearing your browser data removes it.
            </p>

            <h2>Payments</h2>
            <p>
              Cash on delivery is the real payment method. The card option is
              clearly labelled <em>demo only</em>: the fields are not validated,
              not transmitted and not stored. Please do not enter real card
              details anywhere on this site.
            </p>

            <h2>Sharing</h2>
            <p>
              In a live deployment your name, phone number and address would be
              shared with the rider assigned to your order, and with nobody
              else. We would not sell your details or use them for advertising.
            </p>

            <h2>Your choices</h2>
            <ul>
              <li>Order as a guest — no account is required.</li>
              <li>
                Ask us to delete your order history by calling {SITE.phones[0]}.
              </li>
              <li>
                Opt out of WhatsApp updates at any time by replying to any
                message.
              </li>
            </ul>

            <h2>Contact</h2>
            <p>
              Questions about this policy? Call{" "}
              <a href={`tel:${SITE.phoneTel[0]}`} style={{ color: "var(--accent-warm)" }}>
                {SITE.phones[0]}
              </a>{" "}
              or visit us at {SITE.address}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
