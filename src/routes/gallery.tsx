import { createFileRoute } from "@tanstack/react-router";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

const title = "Nail Design Gallery — Mojito Nail Salon";
const description =
  "Browse gel, acrylic, French, seasonal, minimal and pedicure nail designs. Save one design as inspiration for your appointment.";

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
        <h1 className="mt-3 text-4xl sm:text-5xl">Find a look you love</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Save one design to your appointment as a visual reference — it never adds a charge on its
          own, and your technician will talk it through with you.
        </p>
      </div>
      <div className="mt-10">
        <GalleryGrid />
      </div>
    </div>
  );
}
