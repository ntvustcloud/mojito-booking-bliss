import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
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
import {
  BLOCKOUT_KINDS,
  workingTechnicians,
  type BlockoutKind,
  type TechnicianBlockout,
} from "@/data/manager-mock";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  SLOT_MINUTES,
  formatMinutes,
  snapToSlot,
} from "@/data/schedule";

/**
 * Block Time — the single way a technician becomes unavailable.
 * Breaks, lunch, personal time and off-shift stretches are all block time, so
 * nothing about availability is hard-coded.
 */

export type BlockTimeSeed = {
  /** Existing block being edited. */
  blockout?: TechnicianBlockout;
  technicianId?: string;
  start?: number;
};

export function BlockTimeDialog({
  open,
  onOpenChange,
  seed,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: BlockTimeSeed | null;
  onSave: (blockout: TechnicianBlockout) => void;
  onDelete: (id: string) => void;
}) {
  const editing = seed?.blockout;
  const [technicianId, setTechnicianId] = useState(workingTechnicians[0]?.id ?? "");
  const [kind, setKind] = useState<BlockoutKind>("Break");
  const [label, setLabel] = useState("Break");
  const [note, setNote] = useState("");
  const [start, setStart] = useState(DAY_START_MINUTES);
  const [end, setEnd] = useState(DAY_START_MINUTES + 30);

  useEffect(() => {
    if (!open) return;
    const base = editing?.start ?? snapToSlot(seed?.start ?? DAY_START_MINUTES);
    setTechnicianId(editing?.technicianId ?? seed?.technicianId ?? workingTechnicians[0]!.id);
    setKind(editing?.kind ?? "Break");
    setLabel(editing?.label ?? "Break");
    setNote(editing?.note ?? "");
    setStart(base);
    setEnd(editing?.end ?? Math.min(DAY_END_MINUTES, base + 30));
  }, [open, seed, editing]);

  const times = useMemo(() => {
    const list: number[] = [];
    for (let m = DAY_START_MINUTES; m <= DAY_END_MINUTES; m += SLOT_MINUTES) list.push(m);
    return list;
  }, []);

  const valid = end > start && technicianId !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit block time" : "Block time"}</DialogTitle>
          <DialogDescription>
            Mark a technician unavailable. Blocked time refuses appointment drops and removes the
            technician from turn recommendations while it lasts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Technician</label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workingTechnicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Type</label>
              <Select
                value={kind}
                onValueChange={(value) => {
                  const next = value as BlockoutKind;
                  setKind(next);
                  setLabel((current) =>
                    BLOCKOUT_KINDS.includes(current as BlockoutKind) || current.trim() === ""
                      ? next
                      : current,
                  );
                }}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCKOUT_KINDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Label</label>
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Break"
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">From</label>
              <Select value={String(start)} onValueChange={(value) => setStart(Number(value))}>
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
            <div>
              <label className="text-xs font-bold text-muted-foreground">To</label>
              <Select value={String(end)} onValueChange={(value) => setEnd(Number(value))}>
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
            <label className="text-xs font-bold text-muted-foreground">Note (optional)</label>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Dentist appointment, training, kids pickup…"
              className="mt-1 h-9"
            />
          </div>

          {!valid && (
            <p className="text-xs font-bold text-destructive">End time must be after start time.</p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {editing ? (
            <Button
              variant="outline"
              className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete(editing.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <span className="flex gap-2">
            <Button variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-lg"
              disabled={!valid}
              onClick={() => {
                onSave({
                  id: editing?.id ?? `bo-${Date.now()}`,
                  technicianId,
                  kind,
                  label: label.trim() || kind,
                  ...(note.trim() ? { note: note.trim() } : {}),
                  start,
                  end,
                });
                onOpenChange(false);
              }}
            >
              {editing ? "Save" : "Block time"}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
