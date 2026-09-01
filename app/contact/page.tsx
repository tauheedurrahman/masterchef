import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import {
  ClockIcon,
  PhoneIcon,
  PinIcon,
  WhatsAppIcon,
} from "@/components/Icons";
import { SITE, WHATSAPP_LINK } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact Master Chef Peshawar — ${SITE.address}. Call ${SITE.phones[0]} or ${SITE.phones[1]}.`,
};

export default function ContactPage() {
  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Contact</span>
          </div>
          <span className="eyebrow">We pick up fast</span>
          <h1>Get in touch</h1>
          <p className="lede">
            Call to order, message us on WhatsApp, or drop in — we are on Ishrat
            Cinema Road, right by Jan Bakers.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <Reveal>
              <div className="info-block">
                <span className="info-block__icon">
                  <PinIcon size={18} />
                </span>
                <div>
                  <h3>Address</h3>
                  <p>{SITE.address}</p>
                </div>
              </div>

              <div className="info-block">
                <span className="info-block__icon">
                  <PhoneIcon size={18} />
                </span>
                <div>
                  <h3>Phone</h3>
                  <p>
                    <a href={`tel:${SITE.phoneTel[0]}`}>{SITE.phones[0]}</a>
                  </p>
                  <p>
                    <a href={`tel:${SITE.phoneTel[1]}`}>{SITE.phones[1]}</a>
                  </p>
                </div>
              </div>

              <div className="info-block">
                <span className="info-block__icon">
                  <WhatsAppIcon size={18} />
                </span>
                <div>
                  <h3>WhatsApp</h3>
                  <p>
                    <a
                      href={WHATSAPP_LINK}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Message us on WhatsApp
                    </a>
                  </p>
                </div>
              </div>

              <div className="info-block">
                <span className="info-block__icon">
                  <ClockIcon size={18} />
                </span>
                <div>
                  <h3>Opening hours</h3>
                  {SITE.hours.map((h) => (
                    <p key={h.days}>
                      <strong>{h.days}</strong> — {h.time}
                    </p>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                <a href={`tel:${SITE.phoneTel[0]}`} className="btn">
                  <PhoneIcon size={17} /> Call to order
                </a>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn--ghost"
                >
                  <WhatsAppIcon size={17} /> WhatsApp
                </a>
              </div>
            </Reveal>

            <Reveal>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
