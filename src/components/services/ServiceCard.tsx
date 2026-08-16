import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppointment } from "@/state/appointment";
import { formatIncludes, formatServiceMeta, type Service } from "@/data/services";
import { cn } from "@/lib/utils";

/** Gentle crossfading outcome imagery: static with one image, slideshow with 2–4. */
function ServiceImages({ service, active, edgeToEdge }: { service: Service; active: boolean; edgeToEdge?: boolean }) {
  const images = service.images.slice(0, 4);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || images.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % images.length),
      3200,
    );
    return () => window.clearInterval(timer);
  }, [active, images.length]);

  useEffect(() => {
    if (!active) setIndex(0);
  }, [active]);

  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden bg-secondary",
        edgeToEdge ? "rounded-t-2xl" : "rounded-xl",
      )}
    >
      {images.map((image, imageIndex) => (
        <img
          key={image}
          src={image}
          alt={imageIndex === 0 ? `${service.name} result` : ""}
          loading="lazy"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            imageIndex === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((image, dotIndex) => (
            <span
              key={image}
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-cream transition-opacity duration-300",
                dotIndex === index ? "opacity-95" : "opacity-45",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddControl({ service }: { service: Service }) {
  const { hasService, addService } = useAppointment();
  const added = hasService(service.id);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-pressed={added}
            aria-label={added ? `${service.name} added to appointment` : `Add ${service.name} to appointment`}
            onClick={() => {
              if (added) return;
              addService(service.id);
              toast.success(`${service.name} added`, {
                description: "Keep exploring — your appointment is saved.",
              });
            }}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors duration-200",
              added
                ? "border-primary/40 bg-sage-soft text-sage-deep"
                : "border-border bg-card text-primary hover:border-primary/50 hover:bg-secondary",
            )}
          >
            {added ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">{added ? "Added" : "Add to Appointment"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ServiceCard({ service, edgeToEdge }: { service: Service; edgeToEdge?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { hasService } = useAppointment();
  const added = hasService(service.id);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card transition-all duration-300",
        edgeToEdge ? "px-0 pb-3 pt-0 sm:pb-4" : "p-3 sm:p-4",
        added
          ? "border-primary/40 shadow-soft"
          : "border-border shadow-soft hover:-translate-y-0.5 hover:shadow-lift",
      )}
    >
      <ServiceImages service={service} active={hovered} edgeToEdge={edgeToEdge} />

      <div className={cn(edgeToEdge && "px-3 sm:px-4")}>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h3 className="min-w-0 text-lg font-extrabold leading-snug">{service.name}</h3>
        <AddControl service={service} />
      </div>

      <p className="mt-1 text-sm font-semibold text-primary">{formatServiceMeta(service)}</p>
      <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-bold text-foreground">Includes: </span>
        {formatIncludes(service)}.
      </p>
      </div>
    </article>
  );
}
