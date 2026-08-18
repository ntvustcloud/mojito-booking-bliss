import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Footprints, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { services } from "@/data/services";
import { servicesMinutes } from "@/data/service-durations";
import { workingTechnicians, type BookingType } from "@/data/manager-mock";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  SLOT_MINUTES,
  formatMinutes,
  snapToSlot,
} from "@/data/schedule";
import { cn } from "@/lib/utils";

/**
 * ONE quick form for every new customer on the board — walk-in or appointment.
 * Opened from the header "+ Add" button and from clicking an empty slot in a
 * technician column (which pre-fills the technician and time).
 */

export type QuickBookingDraft = {
  type: BookingType;
  name: string;
  phone: string;
  note: string;
  serviceIds: string[];
  technicianId: string;
  /** Anchor time: check-in time for a walk-in, booked time for an appointment. */
  startMinutes: number;
};

export type QuickBookingSeed = {
  technicianId?: string;
  start?: number;
  type?: BookingType;
};

const timeOptions = () => {
  const list: number[] = [];
  for (let m = DAY_START_MINUTES; m < DAY_END_MINUTES; m += SLOT_MINUTES) list.push(m);
  return list;
};

export function QuickBookingDialog({
  open,
  onOpenChange,
  seed,
  nowMinutes,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: QuickBookingSeed | null;
  nowMinutes: number | null;
  onSubmit: (draft: QuickBookingDraft) => void;
}) {
  const defaultStart = snapToSlot(nowMinutes ?? DAY_START_MINUTES);
  const [type, setType] = useState<BookingType>("Walk-In");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [technicianId, setTechnicianId] = useState("any");
  const [startMinutes, setStartMinutes] = useState(defaultStart);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // Re-seed each time the dialog opens (slot click pre-fills tech + time).
  useEffect(() => {
    if (!open) return;
    setType(seed?.type ?? (seed?.start !== undefined ? "Appointment" : "Walk-In"));
    setTechnicianId(seed?.technicianId ?? "any");
    setStartMinutes(seed?.start ?? snapToSlot(nowMinutes ?? DAY_START_MINUTES));
    setName("");
    setPhone("");
    setNote("");
    setServiceIds([]);
    setQuery("");
  }, [open, seed, nowMinutes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(q) || service.category.toLowerCase().includes(q),
    );
  }, [query]);

  const duration = servicesMinutes(serviceIds);
  const times = useMemo(timeOptions, []);

  function toggle(id: string) {
    setServiceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>
            One form for walk-ins and appointments. Name and phone are optional — services decide how
            long the card is.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            {(["Walk-In", "Appointment"] as BookingType[]).map((option) => {
              const Icon = option === "Walk-In" ? Footprints : CalendarDays;
              const selected = type === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors",
                    selected
                      ? option === "Walk-In"
                        ? "border-status-warn-fg/45 bg-status-warn-bg text-status-warn-fg"
                        : "border-status-info-fg/45 bg-status-info-bg text-status-info-fg"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {option}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Name (optional)</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={type === "Walk-In" ? "Walk-In Guest" : "Customer name"}
                className="mt-1 h-9"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Phone (optional)</label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(512) 555-0000"
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Technician</label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Available</SelectItem>
                  {workingTechnicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id}>
                      {technician.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                {type === "Walk-In" ? "Checked in at" : "Booked time"}
              </label>
              <Select
                value={String(startMinutes)}
                onValueChange={(value) => setStartMinutes(Number(value))}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {times.map((minute) => (
                    <SelectItem key={minute} value={String(minute)}>
                      {formatMinutes(minute)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground">
                Services ({serviceIds.length} selected)
              </label>
              <span className="text-xs font-bold text-muted-foreground">
                {duration > 0 ? `${duration} min` : "—"}
              </span>
            </div>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the menu"
                className="h-9 pl-8"
              />
            </div>
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
              {filtered.map((service) => {
                const selected = serviceIds.includes(service.id);
                return (
                  <li key={service.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => toggle(service.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60",
                        selected && "bg-secondary/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border border-border",
                          selected
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground",
                        )}
                      >
                        {selected ? (
                          <Check className="size-3.5" aria-hidden />
                        ) : (
                          <Plus className="size-3.5" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                        {service.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {servicesMinutes([service.id])} min · ${service.price}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-sm text-muted-foreground">No services match.</li>
              )}
            </ul>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything the technician should know"
              className="mt-1 min-h-16 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-lg"
            disabled={serviceIds.length === 0}
            onClick={() => {
              onSubmit({ type, name, phone, note, serviceIds, technicianId, startMinutes });
              onOpenChange(false);
            }}
          >
            {technicianId === "any" ? "Add to Waiting" : "Add to Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
