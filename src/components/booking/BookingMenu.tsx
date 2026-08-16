import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { menuGroups } from "@/data/booking-menu";
import { formatDuration, formatPrice, type Service } from "@/data/services";
import { useAppointment } from "@/state/appointment";
import { cn } from "@/lib/utils";

const TABS = [{ id: "all", label: "All" }, ...menuGroups.map((g) => ({ id: g.id, label: g.label }))];

export function BookingMenu() {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return menuGroups
      .filter((group) => tab === "all" || group.id === tab)
      .map((group) => ({
        ...group,
        services: term
          ? group.services.filter((service) => service.name.toLowerCase().includes(term))
          : group.services,
      }))
      .filter((group) => group.services.length > 0);
  }, [tab, query]);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">Full Salon Menu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap + to add a service straight to your appointment.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services"
            aria-label="Search services"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-xs font-bold transition-colors",
              tab === option.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No services match that search.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <div key={group.id}>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </h3>
              <ul className="mt-3 divide-y divide-border">
                {group.services.map((service) => (
                  <MenuRow key={service.id} service={service} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MenuRow({ service }: { service: Service }) {
  const { hasService, addService, removeService } = useAppointment();
  const added = hasService(service.id);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-bold">{service.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatDuration(service.duration)} · From {formatPrice(service.price)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => (added ? removeService(service.id) : addService(service.id))}
        aria-pressed={added}
        aria-label={added ? `Remove ${service.name}` : `Add ${service.name}`}
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors",
          added
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary",
        )}
      >
        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </li>
  );
}
