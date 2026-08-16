import { useState } from "react";
import { Check, Heart, Maximize2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { galleryDesigns, GALLERY_FILTERS, type GalleryDesign } from "@/data/gallery";
import { getService } from "@/data/services";
import { useAppointment } from "@/state/appointment";
import { cn } from "@/lib/utils";

export function GalleryGrid({ limit }: { limit?: number }) {
  const [filter, setFilter] = useState<string>("All");
  const [openDesign, setOpenDesign] = useState<GalleryDesign | null>(null);
  const { designId, saveDesign, addService, hasService } = useAppointment();

  const filtered = (filter === "All"
    ? galleryDesigns
    : galleryDesigns.filter((design) => design.category === filter)
  ).slice(0, limit);

  const nailArt = getService("nail-art-simple");

  function save(design: GalleryDesign) {
    saveDesign(design.id);
    toast.success(`${design.name} saved to your appointment`, {
      description: "A saved design is a visual reference only — no extra charge.",
    });
  }

  return (
    <div>
      {limit === undefined && (
        <div className="flex flex-wrap gap-2">
          {["All", ...GALLERY_FILTERS].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                filter === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
          limit === undefined && "mt-8",
        )}
      >
        {filtered.map((design) => {
          const saved = designId === design.id;
          return (
            <figure
              key={design.id}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={design.image}
                  alt={design.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>

              <div className="pointer-events-none absolute inset-0 hidden items-end bg-sage-deep/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex lg:group-hover:pointer-events-auto">
                <div className="flex w-full flex-wrap gap-2 p-4">
                  <Button size="sm" variant="outline" onClick={() => setOpenDesign(design)}>
                    <Maximize2 /> View Design
                  </Button>
                  <Button
                    size="sm"
                    variant={saved ? "added" : "default"}
                    onClick={() => save(design)}
                  >
                    {saved ? <Check /> : <Heart />}
                    {saved ? "Saved" : "Save to Appointment"}
                  </Button>
                </div>
              </div>

              <figcaption className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{design.name}</p>
                  <p className="text-xs text-muted-foreground">{design.category}</p>
                </div>
                <div className="flex shrink-0 gap-2 lg:hidden">
                  <Button size="sm" variant="outline" onClick={() => setOpenDesign(design)}>
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant={saved ? "added" : "default"}
                    onClick={() => save(design)}
                    aria-label={`Save ${design.name} to appointment`}
                  >
                    {saved ? <Check /> : <Heart />}
                  </Button>
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <Dialog open={Boolean(openDesign)} onOpenChange={(open) => !open && setOpenDesign(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          {openDesign && (
            <div className="grid md:grid-cols-2">
              <img
                src={openDesign.image}
                alt={openDesign.name}
                loading="lazy"
                className="h-64 w-full object-cover md:h-full"
              />
              <div className="p-6">
                <p className="eyebrow">{openDesign.category}</p>
                <DialogTitle className="mt-2 text-2xl">{openDesign.name}</DialogTitle>
                <DialogDescription className="mt-3 text-sm text-muted-foreground">
                  {openDesign.description}
                </DialogDescription>

                <Button
                  className="mt-6 w-full"
                  variant={designId === openDesign.id ? "added" : "default"}
                  onClick={() => save(openDesign)}
                >
                  {designId === openDesign.id ? <Check /> : <Heart />}
                  {designId === openDesign.id ? "Saved to Appointment" : "Save to Appointment"}
                </Button>

                {openDesign.suggestsNailArt && nailArt && (
                  <div className="mt-4 rounded-xl bg-secondary/70 p-4 text-sm">
                    <p className="flex items-start gap-2 text-secondary-foreground">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                      This design may require a Nail Art add-on.
                    </p>
                    {!hasService(nailArt.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => {
                          addService(nailArt.id);
                          toast.success(`${nailArt.name} added`);
                        }}
                      >
                        Add Nail Art
                      </Button>
                    )}
                  </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground">
                  Saved designs are a visual reference for your technician and never add a charge on
                  their own.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
