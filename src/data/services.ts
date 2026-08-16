import svcPedicure from "@/assets/svc-pedicure.jpg";
import svcDeluxePedi from "@/assets/svc-deluxe-pedi.jpg";
import svcDip from "@/assets/svc-dip.jpg";
import svcAcrylic from "@/assets/svc-acrylic.jpg";
import svcGelx from "@/assets/svc-gelx.jpg";
import galFrench from "@/assets/gal-french.jpg";
import galSage from "@/assets/gal-sage-leaf.jpg";
import galMilky from "@/assets/gal-milky.jpg";
import galAcrylicTaupe from "@/assets/gal-acrylic-taupe.jpg";
import galSeasonal from "@/assets/gal-seasonal.jpg";
import galFloral from "@/assets/gal-floral-art.jpg";
import galPedi from "@/assets/gal-pedi.jpg";
import galGelxLine from "@/assets/gal-gelx-line.jpg";

export type ServiceCategory =
  | "Manicure"
  | "Pedicure"
  | "Gel"
  | "Dip Powder"
  | "Acrylic"
  | "Gel-X"
  | "Nail Art"
  | "Add-ons";

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  duration: number; // minutes
  description: string;
  includes: string[];
  popular?: boolean;
  /** Finished-outcome imagery. One image renders static, 2–4 render as a gentle slideshow. */
  images: string[];
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Manicure",
  "Pedicure",
  "Gel",
  "Dip Powder",
  "Acrylic",
  "Gel-X",
  "Nail Art",
  "Add-ons",
];

export const services: Service[] = [
  {
    id: "signature-pedicure",
    name: "Signature Pedicure",
    category: "Pedicure",
    price: 55,
    duration: 50,
    description: "Relaxing foot care with exfoliation, hydration and a calming massage.",
    includes: [
      "Nail shaping",
      "Cuticle care",
      "Callus treatment",
      "Sugar scrub",
      "Massage",
      "Hot towel",
      "Polish",
    ],
    popular: true,
    images: [galPedi, svcPedicure],
  },
  {
    id: "gel-manicure",
    name: "Gel Manicure",
    category: "Gel",
    price: 45,
    duration: 45,
    description: "Glossy, chip-resistant colour that stays fresh for two to three weeks.",
    includes: [
      "Nail shaping",
      "Cuticle care",
      "Gentle prep",
      "Gel colour",
      "Shine top coat",
      "Cuticle oil",
    ],
    popular: true,
    images: [galFrench, galSage, galMilky],
  },
  {
    id: "acrylic-full-set",
    name: "Acrylic Full Set",
    category: "Acrylic",
    price: 70,
    duration: 75,
    description: "Sculpted length and shape built to last, finished exactly how you like it.",
    includes: [
      "Shape consultation",
      "Full sculpting",
      "Hand filing",
      "Regular or gel colour",
      "Cuticle oil",
    ],
    popular: true,
    images: [galAcrylicTaupe, svcAcrylic],
  },
  {
    id: "deluxe-pedicure",
    name: "Deluxe Pedicure",
    category: "Pedicure",
    price: 75,
    duration: 70,
    description: "A longer, slower ritual with a clay mask and extended leg massage.",
    includes: [
      "Herbal soak",
      "Sea salt scrub",
      "Clay mask",
      "Extended massage",
      "Hot towel",
      "Polish",
    ],
    popular: true,
    images: [svcDeluxePedi, galPedi],
  },
  {
    id: "dip-powder",
    name: "Dip Powder",
    category: "Dip Powder",
    price: 55,
    duration: 55,
    description: "Lightweight, durable colour with a smooth finish and added strength.",
    includes: [
      "Nail shaping",
      "Cuticle care",
      "Dip colour layering",
      "Sealed finish",
      "Strengthening top coat",
    ],
    popular: true,
    images: [galSage, svcDip],
  },
  {
    id: "gel-x-full-set",
    name: "Gel-X Full Set",
    category: "Gel-X",
    price: 80,
    duration: 80,
    description: "Soft gel extensions applied without filing — light, flexible and natural.",
    includes: [
      "Nail prep & sizing",
      "Soft gel tips",
      "Custom shaping",
      "Gel colour",
      "Cuticle oil",
    ],
    popular: true,
    images: [galGelxLine, svcGelx],
  },

  {
    id: "classic-manicure",
    name: "Classic Manicure",
    category: "Manicure",
    price: 30,
    duration: 30,
    description: "A tidy, refreshing reset for your hands with regular polish.",
    includes: ["Nail shaping", "Cuticle care", "Gentle buff", "Hand massage", "Regular polish"],
    images: [galFrench],
  },
  {
    id: "spa-manicure",
    name: "Spa Manicure",
    category: "Manicure",
    price: 42,
    duration: 45,
    description: "Our classic manicure with a sugar scrub and hot towel treatment.",
    includes: [
      "Nail shaping",
      "Cuticle care",
      "Sugar scrub",
      "Extended massage",
      "Hot towel",
      "Regular polish",
    ],
    images: [galFloral, galFrench],
  },
  {
    id: "express-pedicure",
    name: "Express Pedicure",
    category: "Pedicure",
    price: 38,
    duration: 35,
    description: "A quick, clean tidy-up for toes when you are short on time.",
    includes: ["Warm soak", "Nail shaping", "Light callus care", "Regular polish"],
    images: [galPedi],
  },
  {
    id: "gel-pedicure",
    name: "Gel Pedicure",
    category: "Gel",
    price: 62,
    duration: 60,
    description: "Signature pedicure care finished with long-wearing gel colour.",
    includes: [
      "Herbal soak",
      "Nail shaping",
      "Cuticle care",
      "Callus treatment",
      "Massage",
      "Gel colour",
    ],
    images: [galPedi, svcPedicure],
  },
  {
    id: "gel-removal",
    name: "Gel Removal",
    category: "Gel",
    price: 15,
    duration: 20,
    description: "Gentle soak-off removal that protects the natural nail.",
    includes: ["Gentle soak-off", "Careful buff", "Cuticle oil"],
    images: [galMilky],
  },
  {
    id: "dip-french",
    name: "Dip Powder French",
    category: "Dip Powder",
    price: 68,
    duration: 65,
    description: "A hand-drawn French line in dip powder for a crisp, lasting finish.",
    includes: [
      "Nail shaping",
      "Cuticle care",
      "Dip colour layering",
      "Hand-drawn French line",
      "Sealed finish",
    ],
    images: [galFrench, svcDip],
  },
  {
    id: "acrylic-fill",
    name: "Acrylic Fill",
    category: "Acrylic",
    price: 52,
    duration: 55,
    description: "Keep your set looking new with a careful rebalance and refill.",
    includes: ["Rebalance & refill", "Reshaping", "Colour reapplication", "Cuticle care"],
    images: [svcAcrylic, galAcrylicTaupe],
  },
  {
    id: "gel-x-fill",
    name: "Gel-X Refresh",
    category: "Gel-X",
    price: 60,
    duration: 60,
    description: "Refresh the growth area and colour on an existing Gel-X set.",
    includes: ["Growth-area fill", "Reshaping", "Colour refresh", "Cuticle oil"],
    images: [svcGelx, galGelxLine],
  },
  {
    id: "nail-art-simple",
    name: "Nail Art — Simple",
    category: "Nail Art",
    price: 12,
    duration: 15,
    description: "A few accent nails: lines, dots, tiny florals or a soft French.",
    includes: ["Up to 2 accent nails", "Hand-painted detail", "Sealed top coat"],
    images: [galSage, galSeasonal],
  },
  {
    id: "nail-art-detailed",
    name: "Nail Art — Detailed",
    category: "Nail Art",
    price: 28,
    duration: 30,
    description: "Full-set custom artwork designed with you from your inspiration photo.",
    includes: [
      "Design consultation",
      "Full-set hand-painted art",
      "Chrome or foil accents",
      "Sealed top coat",
    ],
    images: [galFloral, galSeasonal],
  },
  {
    id: "paraffin-add-on",
    name: "Paraffin Treatment",
    category: "Add-ons",
    price: 15,
    duration: 15,
    description: "A warm paraffin wrap for soft, hydrated hands or feet.",
    includes: ["Warm paraffin dip", "Hot towel wrap", "Hydrating balm"],
    images: [svcDeluxePedi],
  },
  {
    id: "callus-add-on",
    name: "Extra Callus Care",
    category: "Add-ons",
    price: 12,
    duration: 15,
    description: "Additional smoothing for heels that need a little more attention.",
    includes: ["Extended callus work", "Sea salt scrub", "Hydrating balm"],
    images: [svcPedicure],
  },
];

/** The three services featured on the homepage. */
export const HOMEPAGE_SERVICE_IDS = [
  "signature-pedicure",
  "gel-manicure",
  "acrylic-full-set",
] as const;

export const popularServices = services.filter((service) => service.popular);

export const homepageServices = HOMEPAGE_SERVICE_IDS.map(
  (id) => services.find((service) => service.id === id)!,
);

export function getService(id: string): Service | undefined {
  return services.find((service) => service.id === id);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatPrice(amount: number): string {
  return `$${amount}`;
}

/** "50 min · From $55" — the single meta line used on every service card. */
export function formatServiceMeta(service: Service): string {
  return `${formatDuration(service.duration)} · From ${formatPrice(service.price)}`;
}

/** "Nail shaping, cuticle care, callus treatment…" — kept to 4–7 items. */
export function formatIncludes(service: Service): string {
  return service.includes
    .slice(0, 7)
    .map((item, index) => (index === 0 ? item : item.charAt(0).toLowerCase() + item.slice(1)))
    .join(", ");
}
