import { MapPin, Phone, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { salon } from "@/data/salon";

export function VisitUs() {
  return (
    <section className="section-shell py-20">
      <div className="max-w-2xl">
        <p className="eyebrow">Visit Us</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">Find us on Willow Creek</h2>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h3 className="text-2xl">{salon.name}</h3>

          <dl className="mt-6 space-y-5 text-sm">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="font-bold">Address</dt>
                <dd className="text-muted-foreground">{salon.address}</dd>
              </div>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="font-bold">Phone</dt>
                <dd>
                  <a href={salon.phoneHref} className="text-muted-foreground hover:text-foreground">
                    {salon.phone}
                  </a>
                </dd>
              </div>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="font-bold">Hours</dt>
                <dd className="space-y-1 text-muted-foreground">
                  {salon.hours.map((entry) => (
                    <p key={entry.day} className="flex flex-wrap justify-between gap-2">
                      <span>{entry.day}</span>
                      <span>{entry.time}</span>
                    </p>
                  ))}
                </dd>
              </div>
            </div>
          </dl>

          <Button asChild className="mt-8">
            <a href={salon.mapsUrl} target="_blank" rel="noreferrer noopener">
              <Navigation /> Get Directions
            </a>
          </Button>
        </div>

        {/* Map placeholder — swap for an embedded map later. */}
        <div
          className="relative min-h-[320px] overflow-hidden rounded-3xl border border-border bg-secondary/70"
          role="img"
          aria-label="Map placeholder showing the salon location"
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div aria-hidden className="absolute left-0 top-1/3 h-6 w-full bg-cream/80" />
          <div aria-hidden className="absolute left-1/4 top-0 h-full w-5 bg-cream/80" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-card/95 px-6 py-5 text-center shadow-soft">
              <MapPin className="h-6 w-6 text-primary" />
              <p className="font-bold">{salon.name}</p>
              <p className="max-w-[16rem] text-xs text-muted-foreground">{salon.address}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
