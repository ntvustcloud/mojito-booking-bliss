import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { AddServiceButton } from "@/components/site/AddServiceButton";
import { formatDuration, formatPrice, type Service } from "@/data/services";
import { useAppointment } from "@/state/appointment";
import { cn } from "@/lib/utils";

export function ServiceCard({ service }: { service: Service }) {
  const [expanded, setExpanded] = useState(false);
  const { hasService } = useAppointment();
  const added = hasService(service.id);
  const includes = service.includes.slice(0, 6);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border bg-card p-5 transition-all duration-300",
        added ? "border-primary/50 shadow-soft" : "border-border hover:border-primary/30 hover:shadow-lift",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h3 className="min-w-0 text-lg font-extrabold leading-snug">{service.name}</h3>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
          {formatPrice(service.price)}
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration)}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{service.description}</p>

      {/* Desktop: reveal on hover. Mobile: tap to expand. Height is reserved so cards never jump. */}
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 lg:grid-rows-[0fr] lg:opacity-0 lg:group-hover:grid-rows-[1fr] lg:group-hover:opacity-100",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
            {includes.map((item) => (
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

      <div className="mt-5 flex flex-wrap items-center gap-3 pt-1">
        <AddServiceButton service={service} />
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground lg:hidden"
        >
          What's Included
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
    </article>
  );
}
