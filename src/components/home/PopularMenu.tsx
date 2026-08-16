import { useState } from "react";
import { Clock, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDuration, formatPrice, popularServices } from "@/data/services";
import { useAppointment } from "@/state/appointment";
import { cn } from "@/lib/utils";

export function PopularMenu() {
  const [activeId, setActiveId] = useState(popularServices[0]!.id);
  const { hasService, addService } = useAppointment();
  const active = popularServices.find((service) => service.id === activeId) ?? popularServices[0]!;


  return (
    <section id="menu" className="section-shell scroll-mt-24 py-20">
      <div className="max-w-2xl">
        <p className="eyebrow">Our Menu</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">Six services our guests book most</h2>
        <p className="mt-4 text-muted-foreground">
          Hover a service to read its story, then add it to your appointment without leaving the
          page. See the full menu on our{" "}
          <span className="font-semibold text-foreground">Services</span> page.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* Fixed 2 x 3 grid — cards never reorder or resize on hover. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {popularServices.map((service) => {
            const added = hasService(service.id);
            const isActive = service.id === active.id;
            return (
              <div
                key={service.id}
                onMouseEnter={() => setActiveId(service.id)}
                onFocus={() => setActiveId(service.id)}
                tabIndex={0}
                className={cn(
                  "flex min-h-[190px] flex-col rounded-2xl border bg-card p-5 transition-colors duration-300 outline-none",
                  isActive
                    ? "border-primary/50 bg-secondary/50"
                    : "border-border hover:border-primary/30",
                )}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <h3 className="min-w-0 text-base font-extrabold leading-snug">{service.name}</h3>
                  <span className="shrink-0 text-sm font-bold text-primary">
                    from {formatPrice(service.price)}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration)}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {service.description}
                </p>

                <div className="mt-auto pt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant={added ? "added" : "default"}
                    aria-pressed={added}
                    onClick={() => {
                      if (added) return;
                      addService(service.id);
                      toast.success(`${service.name} added`, {
                        description: "Keep exploring — your appointment is saved.",
                      });
                    }}
                    className={cn(
                      "transition-opacity duration-200",
                      added || isActive ? "opacity-100" : "opacity-0 lg:opacity-0",
                    )}
                  >
                    {added ? <Check /> : <Plus />}
                    {added ? "Added" : "Add to Appointment"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Service Story panel — fixed position, crossfading content. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            <div className="relative aspect-[4/3] bg-secondary">
              {popularServices.map((service) => (
                <img
                  key={service.id}
                  src={service.media}
                  alt={service.name}
                  loading="lazy"
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                    service.id === active.id ? "opacity-100" : "opacity-0",
                  )}
                />
              ))}
            </div>
            <div key={active.id} className="fade-soft p-6">
              <h3 className="text-2xl">{active.name}</h3>
              <p className="mt-2 text-sm font-bold text-primary">
                Starting at {formatPrice(active.price)} · about {formatDuration(active.duration)}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">{active.description}</p>
              <h4 className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                What's Included
              </h4>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {active.includes.slice(0, 6).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="text-primary">
                      ·
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
