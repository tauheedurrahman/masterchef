import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

import Navbar, { type SearchIndexItem } from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsAppButton from "@/components/FloatingWhatsAppButton";
import Toaster from "@/components/Toaster";
import { CartProvider } from "@/lib/store";
import { getItems } from "@/lib/api";
import { minPrice } from "@/lib/format";
import { SITE } from "@/lib/site";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://masterchef.example"),
  title: {
    default: `${SITE.nameUpper} — ${SITE.tagline}`,
    template: `%s · ${SITE.nameUpper}`,
  },
  description:
    "Master Chef Peshawar — zinger burgers, shawarma, paratha rolls, pizza, fries and continental. Home delivery and pickup from Gulbahar No. 3, Ishrat Cinema Road.",
  keywords: [
    "Master Chef Peshawar",
    "burgers Peshawar",
    "shawarma delivery",
    "paratha roll",
    "fast food Peshawar",
  ],
  openGraph: {
    title: `${SITE.nameUpper} — ${SITE.tagline}`,
    description:
      "Fast food and continental in Peshawar. Order online for delivery or pickup.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#12100f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lightweight search index for the navbar overlay. Built on the server
  // through the api layer so the client never imports the data module.
  const all = await getItems();
  const index: SearchIndexItem[] = all.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    image: i.images[0],
    from: minPrice(i.variants),
  }));

  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable}`}>
      <body>
        <CartProvider>
          <Navbar index={index} />
          <main>{children}</main>
          <Footer />
          <FloatingWhatsAppButton />
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
