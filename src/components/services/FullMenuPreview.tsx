import { Maximize2 } from "lucide-react";
import menuImage from "@/assets/full-menu.jpg";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function FullMenuPreview() {
  return (
    <section id="full-menu" className="scroll-mt-24">
      <div className="max-w-2xl">
        <p className="eyebrow">In-Salon Menu</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">Full salon menu</h2>
        <p className="mt-4 text-muted-foreground">
          The same printed menu you'll find on the counter. Tap it to view a larger version.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="View the full salon menu larger"
              className="group relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <img
                src={menuImage}
                alt="Printed Mojito Nail Salon service menu listing manicures, pedicures, extensions and add-ons with prices"
                width={1024}
                height={1408}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/95 px-4 py-2 text-sm font-bold shadow-soft">
                <Maximize2 className="h-4 w-4 text-primary" /> View larger
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl overflow-hidden p-2 sm:p-3">
            <DialogTitle className="sr-only">Full salon menu</DialogTitle>
            <img
              src={menuImage}
              alt="Printed Mojito Nail Salon service menu listing manicures, pedicures, extensions and add-ons with prices"
              width={1024}
              height={1408}
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
