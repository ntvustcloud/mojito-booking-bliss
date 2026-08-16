import svcPedicure from "@/assets/svc-pedicure.jpg";
import svcGelMani from "@/assets/svc-gel-mani.jpg";
import svcDeluxePedi from "@/assets/svc-deluxe-pedi.jpg";
import svcDip from "@/assets/svc-dip.jpg";
import svcAcrylic from "@/assets/svc-acrylic.jpg";
import svcGelx from "@/assets/svc-gelx.jpg";

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
  /** Placeholder media for the Service Story panel — swap for real photo/video later. */
  media?: string;
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
    description:
      "Our most-loved pedicure. A warm soak, careful nail work and a calming leg massage to reset your week.",
    includes: [
      "Warm herbal soak",
      "Nail shaping & cuticle care",
      "Callus treatment",
      "Sugar scrub & massage",
      "Hot towel wrap",
      "Polish of your choice",
    ],
    popular: true,
    media: svcPedicure,
  },
  {
    id: "gel-manicure",
    name: "Gel Manicure",
    category: "Gel",
    price: 45,
    duration: 45,
    description:
      "A glossy, chip-resistant finish that stays fresh for two to three weeks with gentle, careful prep.",
    includes: [
      "Nail shaping & cuticle care",
      "Buff & gentle prep",
      "Gel color application",
      "Cured shine top coat",
      "Cuticle oil finish",
    ],
    popular: true,
    media: svcGelMani,
  },
  {
    id: "deluxe-pedicure",
    name: "Deluxe Pedicure",
    category: "Pedicure",
    price: 75,
    duration: 70,
    description:
      "The longer, slower version of our signature ritual, with a clay mask and extended massage.",
    includes: [
      "Extended herbal soak",
      "Sea salt scrub",
      "Clay foot mask",
      "Extended leg massage",
      "Hot towel wrap",
      "Polish of your choice",
    ],
    popular: true,
    media: svcDeluxePedi,
  },
  {
    id: "dip-powder",
    name: "Dip Powder",
    category: "Dip Powder",
    price: 55,
    duration: 55,
    description:
      "Lightweight, durable color with a smooth finish — a lovely option for natural nails that need strength.",
    includes: [
      "Nail shaping & cuticle care",
      "Dip color layering",
      "Sealed & buffed finish",
      "Strengthening top coat",
      "Cuticle oil finish",
    ],
    popular: true,
    media: svcDip,
  },
  {
    id: "acrylic-full-set",
    name: "Acrylic Full Set",
    category: "Acrylic",
    price: 70,
    duration: 75,
    description:
      "Sculpted length and shape built to last, finished exactly the way you like it — short, almond or square.",
    includes: [
      "Length & shape consultation",
      "Full acrylic sculpting",
      "Hand filing & shaping",
      "Regular or gel color",
      "Cuticle oil finish",
    ],
    popular: true,
    media: svcAcrylic,
  },
  {
    id: "gel-x-full-set",
    name: "Gel-X Full Set",
    category: "Gel-X",
    price: 80,
    duration: 80,
    description:
      "Soft gel extensions applied without filing your natural nail — light, flexible and beautifully natural.",
    includes: [
      "Nail prep & sizing",
      "Soft gel extension tips",
      "Custom shaping",
      "Gel color or clean natural finish",
      "Cuticle oil finish",
    ],
    popular: true,
    media: svcGelx,
  },

  {
    id: "classic-manicure",
    name: "Classic Manicure",
    category: "Manicure",
    price: 30,
    duration: 30,
    description: "A tidy, refreshing reset for your hands with regular polish.",
    includes: [
      "Nail shaping & cuticle care",
      "Gentle buff",
      "Hand massage",
      "Regular polish",
    ],
  },
  {
    id: "spa-manicure",
    name: "Spa Manicure",
    category: "Manicure",
    price: 42,
    duration: 45,
    description: "Our classic manicure with a sugar scrub and hot towel treatment.",
    includes: [
      "Nail shaping & cuticle care",
      "Sugar scrub",
      "Extended hand massage",
      "Hot towel wrap",
      "Regular polish",
    ],
  },
  {
    id: "express-pedicure",
    name: "Express Pedicure",
    category: "Pedicure",
    price: 38,
    duration: 35,
    description: "A quick, clean tidy-up when you are short on time.",
    includes: ["Warm soak", "Nail shaping", "Light callus care", "Regular polish"],
  },
  {
    id: "gel-pedicure",
    name: "Gel Pedicure",
    category: "Gel",
    price: 62,
    duration: 60,
    description: "Signature pedicure care finished with long-wearing gel color.",
    includes: [
      "Warm herbal soak",
      "Nail shaping & cuticle care",
      "Callus treatment",
      "Relaxing massage",
      "Gel color application",
    ],
  },
  {
    id: "gel-removal",
    name: "Gel Removal",
    category: "Gel",
    price: 15,
    duration: 20,
    description: "Gentle soak-off removal that protects the natural nail.",
    includes: ["Gentle soak-off", "Careful buff", "Nourishing cuticle oil"],
  },
  {
    id: "dip-french",
    name: "Dip Powder French",
    category: "Dip Powder",
    price: 68,
    duration: 65,
    description: "Hand-drawn French line in dip powder for a crisp, lasting finish.",
    includes: [
      "Nail shaping & cuticle care",
      "Dip color layering",
      "Hand-drawn French line",
      "Sealed & buffed finish",
    ],
  },
  {
    id: "acrylic-fill",
    name: "Acrylic Fill",
    category: "Acrylic",
    price: 52,
    duration: 55,
    description: "Keep your set looking new with a careful rebalance and refill.",
    includes: ["Rebalance & refill", "Reshaping", "Color reapplication", "Cuticle care"],
  },
  {
    id: "gel-x-fill",
    name: "Gel-X Refresh",
    category: "Gel-X",
    price: 60,
    duration: 60,
    description: "Refresh the growth area and color on an existing Gel-X set.",
    includes: ["Growth-area fill", "Reshaping", "Color refresh", "Cuticle oil finish"],
  },
  {
    id: "nail-art-simple",
    name: "Nail Art — Simple",
    category: "Nail Art",
    price: 12,
    duration: 15,
    description: "A few accent nails: lines, dots, tiny florals or a soft French.",
    includes: ["Up to 2 accent nails", "Hand-painted detail", "Sealed top coat"],
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
  },
  {
    id: "paraffin-add-on",
    name: "Paraffin Treatment",
    category: "Add-ons",
    price: 15,
    duration: 15,
    description: "Warm paraffin wrap for soft, hydrated hands or feet.",
    includes: ["Warm paraffin dip", "Hot towel wrap", "Hydrating balm"],
  },
  {
    id: "callus-add-on",
    name: "Extra Callus Care",
    category: "Add-ons",
    price: 12,
    duration: 15,
    description: "Additional smoothing for heels that need a little more attention.",
    includes: ["Extended callus work", "Sea salt scrub", "Hydrating balm"],
  },
];

export const popularServices = services.filter((service) => service.popular);

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
