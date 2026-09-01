import { WHATSAPP_LINK } from "@/lib/site";
import { WhatsAppIcon } from "./Icons";

/** Persistent WhatsApp order shortcut, bottom-right on every page. */
export default function FloatingWhatsAppButton() {
  return (
    <a
      className="wa-fab"
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Order on WhatsApp"
      title="Order on WhatsApp"
    >
      <WhatsAppIcon size={27} />
    </a>
  );
}
