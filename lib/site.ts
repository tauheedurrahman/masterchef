/** Brand + contact constants — one place to change the restaurant's details. */

export const SITE = {
  name: "Master Chef",
  nameUpper: "MASTER CHEF",
  tagline: "Hot and Delicious — Full of Flavors",
  shortTagline: "Hot & Delicious",
  address: "Gulbahar No. 3, Near Jan Bakers, Ishrat Cinema Road, Peshawar",
  city: "Peshawar",
  phones: ["0345-0676764", "0315-0565515"],
  /** International form for tel:/wa.me links. */
  phoneTel: ["+923450676764", "+923150565515"],
  whatsapp: "923450676764",
  hours: [
    { days: "Monday – Thursday", time: "12:00 PM – 2:00 AM" },
    { days: "Friday – Sunday", time: "12:00 PM – 3:00 AM" },
    { days: "Midnight Deals", time: "After 10:30 PM" },
  ],
  freeDeliveryOver: 1500,
  deliveryFee: 100,
  etaMinutes: "35–45 min",
} as const;

export const WHATSAPP_LINK = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
  "Hi Master Chef! I'd like to place an order."
)}`;

export const ANNOUNCEMENTS = [
  "Free delivery over Rs 1,500",
  `Call to order: ${SITE.phones[0]}`,
  "Midnight deals after 10:30 PM",
];
