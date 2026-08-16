import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { services } from "@/data/services";
import { workingTechnicians } from "@/data/manager-mock";
import { cn } from "@/lib/utils";

export type WalkInDraft = {
  name: string;
  phone: string;
  serviceIds: string[];
  technicianId: string;
};

export function WalkInDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: WalkInDraft) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [technicianId, setTechnicianId] = useState("any");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(q) || service.category.toLowerCase().includes(q),
    );
  }, [query]);

  function toggle(id: string) {
    setServiceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function reset() {
    setName("");
    setPhone("");
    setTechnicianId("any");
    setServiceIds([]);
    setQuery("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New walk-in</DialogTitle>
          <DialogDescription>
            Name and phone are optional — add services and send them to the waiting list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Name (optional)</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Walk-in"
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

          <div>
            <label className="text-xs font-bold text-muted-foreground">Technician</label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any available</SelectItem>
                {workingTechnicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground">
                Services ({serviceIds.length} selected)
              </label>
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
            <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
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
                        {service.duration} min · ${service.price}
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-lg"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
          >
            Cancel
          </Button>
          <Button
            className="rounded-lg"
            disabled={serviceIds.length === 0}
            onClick={() => {
              onSubmit({ name, phone, serviceIds, technicianId });
              onOpenChange(false);
              reset();
            }}
          >
            Add to Waiting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
