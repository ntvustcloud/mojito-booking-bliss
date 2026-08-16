import { createFileRoute } from "@tanstack/react-router";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

const title = "Nail Design Gallery — Mojito Nail Salon";
const description =
  "Browse real gel, acrylic, French, nail art, seasonal and pedicure sets finished at Mojito Nail Salon.";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  return (
    <div className="section-shell py-12 lg:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Gallery</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Our work</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A portfolio of real nail sets finished in our chairs. Tap any photo to see it larger — save
          it to your phone or show it to your technician at your visit.
        </p>
      </div>
      <div className="mt-10">
        <GalleryGrid />
      </div>
    </div>
  );
}
