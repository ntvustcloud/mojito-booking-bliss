import galFrench from "@/assets/gal-french.jpg";
import galSage from "@/assets/gal-sage-leaf.jpg";
import galMilky from "@/assets/gal-milky.jpg";
import galAcrylic from "@/assets/gal-acrylic-taupe.jpg";
import galSeasonal from "@/assets/gal-seasonal.jpg";
import galFloral from "@/assets/gal-floral-art.jpg";
import galPedi from "@/assets/gal-pedi.jpg";
import galGelx from "@/assets/gal-gelx-line.jpg";

export type GalleryFilter = "Gel" | "Acrylic" | "French" | "Nail Art" | "Seasonal" | "Pedicure";

export type GalleryDesign = {
  id: string;
  name: string;
  category: GalleryFilter;
  description: string;
  image: string;
};

export const GALLERY_FILTERS: GalleryFilter[] = [
  "Gel",
  "Acrylic",
  "French",
  "Nail Art",
  "Seasonal",
  "Pedicure",
];

export const galleryDesigns: GalleryDesign[] = [
  {
    id: "soft-french",
    name: "Soft Classic French",
    category: "French",
    description:
      "A timeless white tip on a short almond shape — clean, quiet and suitable for absolutely everything.",
    image: galFrench,
  },
  {
    id: "sage-leaf",
    name: "Sage Leaf Minimal",
    category: "Nail Art",
    description:
      "Our house shade with the faintest hand-drawn leaf detail. Calm colour, gentle line work.",
    image: galSage,
  },
  {
    id: "milky-clean",
    name: "Milky Clean Gel",
    category: "Gel",
    description:
      "Sheer milky white gel for a fresh, barely-there finish that flatters short natural nails.",
    image: galMilky,
  },
  {
    id: "taupe-almond",
    name: "Warm Taupe Almond",
    category: "Acrylic",
    description:
      "A sculpted almond set in a warm neutral taupe — soft length with a very wearable colour.",
    image: galAcrylic,
  },
  {
    id: "autumn-leaf",
    name: "Autumn Leaf Accent",
    category: "Seasonal",
    description:
      "Muted olive and warm caramel with a single pressed-leaf accent nail for the cooler months.",
    image: galSeasonal,
  },
  {
    id: "garden-floral",
    name: "Garden Floral",
    category: "Nail Art",
    description:
      "Delicate hand-painted florals in sage and cream — our most requested detailed design.",
    image: galFloral,
  },
  {
    id: "fresh-neutral-toes",
    name: "Fresh Neutral Toes",
    category: "Pedicure",
    description:
      "A soft neutral pedicure finish that looks polished with sandals and with socks alike.",
    image: galPedi,
  },
  {
    id: "gelx-fine-line",
    name: "Gel-X Fine Line",
    category: "Gel",
    description: "Translucent nude Gel-X with one whisper-thin line for a subtle bit of structure.",
    image: galGelx,
  },
];

export function getDesign(id: string): GalleryDesign | undefined {
  return galleryDesigns.find((design) => design.id === id);
}
