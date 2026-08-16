import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { galleryDesigns, GALLERY_FILTERS } from "@/data/gallery";
import { cn } from "@/lib/utils";

export function GalleryGrid({ limit }: { limit?: number }) {
  const [filter, setFilter] = useState<string>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = (
    filter === "All"
      ? galleryDesigns
      : galleryDesigns.filter((design) => design.category === filter)
  ).slice(0, limit);

  const current = openIndex === null ? null : (filtered[openIndex] ?? null);

  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((index) => {
        if (index === null) return index;
        return (index + direction + filtered.length) % filtered.length;
      });
    },
    [filtered.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, step]);

  return (
    <div>
      {limit === undefined && (
        <div className="flex flex-wrap gap-2">
          {["All", ...GALLERY_FILTERS].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setFilter(option);
                setOpenIndex(null);
              }}
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
        className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", limit === undefined && "mt-8")}
      >
        {filtered.map((design, index) => (
          <figure
            key={design.id}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="block w-full text-left"
              aria-label={`View ${design.name} larger`}
            >
              <span className="block aspect-[4/5] overflow-hidden">
                <img
                  src={design.image}
                  alt={design.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </span>
              <span className="pointer-events-none absolute inset-0 hidden items-end justify-center bg-sage-deep/35 pb-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
                <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-foreground">
                  <Maximize2 className="h-4 w-4" /> View Larger
                </span>
              </span>
            </button>
            <figcaption className="p-4">
              <p className="truncate font-bold">{design.name}</p>
              <p className="text-xs text-muted-foreground">{design.category}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none bg-transparent p-0 shadow-none">
          {current && (
            <div className="relative">
              <DialogTitle className="sr-only">{current.name}</DialogTitle>
              <img
                src={current.image}
                alt={current.name}
                className="mx-auto max-h-[80vh] w-auto rounded-2xl object-contain"
              />
              <div className="mt-3 text-center text-sm font-semibold text-primary-foreground drop-shadow lg:text-foreground">
                {current.name}
              </div>

              {filtered.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous design"
                    className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground transition-colors hover:bg-card"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next design"
                    className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground transition-colors hover:bg-card"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
