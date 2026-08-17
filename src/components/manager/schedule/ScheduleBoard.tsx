import { useCallback, useMemo, useRef, useState } from "react";
import { Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_TONE, DOT_TONE } from "@/components/manager/schedule/scheduleTone";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  PIXELS_PER_MINUTE,
  SLOT_HEIGHT,
  SLOT_MINUTES,
  buildBlocks,
  findConflict,
  formatMinutes,
  formatShortMinutes,
  isQueued,
  minutesToOffset,
  nextFreeMinute,
  offsetToMinutes,
  slotCount,
  snapToSlot,
  type ScheduleBlock,
} from "@/data/schedule";
import type { Appointment, TechnicianRow } from "@/data/manager-mock";

export type MoveRequest = {
  block: ScheduleBlock;
  technicianId: string;
  start: number;
  conflictWith?: ScheduleBlock;
};

const GROUP_ACCENTS = [
  "before:bg-primary",
  "before:bg-status-info-fg",
  "before:bg-status-warn-fg",
  "before:bg-status-live-fg",
];

function groupAccent(appointmentId: string) {
  const index =
    appointmentId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    GROUP_ACCENTS.length;
  return GROUP_ACCENTS[index]!;
}

function BlockCard({
  block,
  compact,
  onOpen,
  onDragStart,
}: {
  block: ScheduleBlock;
  compact?: boolean;
  onOpen: () => void;
  onDragStart: (event: React.DragEvent) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-lg border px-2 py-1 text-left leading-tight shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-md",
        block.isGroup &&
          cn(
            "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
            groupAccent(block.appointmentId),
          ),
        block.isGroup && "pl-2.5",
        CARD_TONE[block.status],
      )}
    >
      <span className="flex items-center gap-1 text-[10px] font-extrabold tracking-wide opacity-80">
        {formatShortMinutes(block.start)}–{formatShortMinutes(block.start + block.duration)}
        {block.isGroup && <Users className="size-3" aria-hidden />}
      </span>
      <span className="truncate text-xs font-extrabold">{block.guestName}</span>
      {!compact && (
        <span className="truncate text-[11px] leading-tight opacity-85">{block.serviceLabel}</span>
      )}
      <span className="mt-auto flex items-center gap-1 text-[10px] font-bold">
        <span className={cn("size-1.5 rounded-full", DOT_TONE[block.status])} aria-hidden />
        {block.status}
      </span>
    </button>
  );
}

export function ScheduleBoard({
  appointments,
  technicians,
  nowMinutes,
  onOpenAppointment,
  onMove,
  onCreateAt,
}: {
  appointments: Appointment[];
  technicians: TechnicianRow[];
  nowMinutes: number | null;
  onOpenAppointment: (appointmentId: string) => void;
  onMove: (request: MoveRequest) => void;
  onCreateAt: (technicianId: string, start: number) => void;
}) {
  const blocks = useMemo(() => buildBlocks(appointments), [appointments]);
  const queue = useMemo(() => blocks.filter(isQueued).sort((a, b) => a.start - b.start), [blocks]);
  const dragged = useRef<ScheduleBlock | null>(null);
  const [hover, setHover] = useState<{ technicianId: string; start: number } | null>(null);

  const totalHeight = slotCount() * SLOT_HEIGHT;
  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let m = DAY_START_MINUTES; m < DAY_END_MINUTES; m += SLOT_MINUTES) list.push(m);
    return list;
  }, []);

  const startFromEvent = useCallback((event: React.DragEvent | React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return snapToSlot(offsetToMinutes(event.clientY - rect.top));
  }, []);

  function handleDrop(event: React.DragEvent, technicianId: string) {
    event.preventDefault();
    const block = dragged.current;
    setHover(null);
    dragged.current = null;
    if (!block) return;
    const start = technicianId === "any" ? block.start : startFromEvent(event);
    if (block.technicianId === technicianId && block.start === start) return;
    const conflict =
      technicianId === "any"
        ? null
        : findConflict(blocks, technicianId, start, block.duration, block.key);
    onMove({ block, technicianId, start, ...(conflict ? { conflictWith: conflict } : {}) });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="max-h-[calc(100vh-13rem)] overflow-auto">
        <div className="min-w-[56rem]">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `4.5rem 13rem repeat(${technicians.length}, minmax(11rem, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="sticky top-0 left-0 z-30 border-r border-b border-border bg-muted/70 px-2 py-2 backdrop-blur">
              <span className="text-[10px] font-extrabold tracking-[0.12em] uppercase text-muted-foreground">
                Time
              </span>
            </div>
            <div className="sticky top-0 z-20 border-r border-b border-border bg-muted/70 px-3 py-2 backdrop-blur">
              <p className="text-[11px] font-extrabold tracking-wide uppercase text-muted-foreground">
                Waiting / Unassigned
              </p>
              <p className="text-[11px] font-bold text-status-warn-fg">{queue.length} in queue</p>
            </div>
            {technicians.map((technician) => {
              const free = nextFreeMinute(blocks, technician.id, nowMinutes ?? DAY_START_MINUTES);
              return (
                <div
                  key={technician.id}
                  className="sticky top-0 z-20 border-r border-b border-border bg-muted/70 px-3 py-2 backdrop-blur last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-[10px] font-extrabold text-secondary-foreground">
                      {technician.initials}
                    </span>
                    <p className="truncate text-sm font-extrabold text-foreground">
                      {technician.name}
                    </p>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        technician.state === "Available" && "bg-status-live-fg",
                        technician.state === "In Service" && "bg-status-info-fg",
                        technician.state === "Break" && "bg-status-warn-fg",
                        technician.state === "Off" && "bg-status-neutral-fg/50",
                      )}
                      aria-hidden
                    />
                    {technician.state}
                    {technician.state === "In Service" && nowMinutes !== null && free > nowMinutes
                      ? ` · free ~${formatShortMinutes(free)}`
                      : ""}
                  </p>
                </div>
              );
            })}

            {/* Time column */}
            <div
              className="sticky left-0 z-10 border-r border-border bg-muted/40"
              style={{ height: totalHeight }}
            >
              {ticks.map((minute) => (
                <div
                  key={minute}
                  className={cn(
                    "relative border-b",
                    minute % 60 === 0 ? "border-border" : "border-transparent",
                  )}
                  style={{ height: SLOT_HEIGHT }}
                >
                  {minute % 60 === 0 && (
                    <span className="absolute top-0.5 right-2 text-[11px] font-extrabold text-muted-foreground">
                      {formatShortMinutes(minute)}
                    </span>
                  )}
                </div>
              ))}
              {nowMinutes !== null &&
                nowMinutes >= DAY_START_MINUTES &&
                nowMinutes <= DAY_END_MINUTES && (
                  <span
                    className="absolute right-1 z-20 -translate-y-1/2 rounded bg-destructive px-1 py-0.5 text-[10px] font-extrabold text-destructive-foreground"
                    style={{ top: minutesToOffset(nowMinutes) }}
                  >
                    {formatMinutes(nowMinutes)}
                  </span>
                )}
            </div>

            {/* Waiting queue column */}
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, "any")}
              className="space-y-2 border-r border-border bg-status-warn-bg/20 p-2"
              style={{ height: totalHeight }}
            >
              {queue.map((block) => (
                <div key={block.key} className="h-[4.5rem]">
                  <BlockCard
                    block={block}
                    onOpen={() => onOpenAppointment(block.appointmentId)}
                    onDragStart={(event) => {
                      dragged.current = block;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", block.key);
                    }}
                  />
                </div>
              ))}
              {queue.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">
                  Nobody waiting — every guest has a technician.
                </p>
              )}
            </div>

            {/* Technician columns */}
            {technicians.map((technician) => {
              const columnBlocks = blocks.filter((block) => block.technicianId === technician.id);
              return (
                <div
                  key={technician.id}
                  className="relative border-r border-border last:border-r-0"
                  style={{ height: totalHeight }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setHover({ technicianId: technician.id, start: startFromEvent(event) });
                  }}
                  onDragLeave={() => setHover(null)}
                  onDrop={(event) => handleDrop(event, technician.id)}
                  onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    onCreateAt(technician.id, startFromEvent(event));
                  }}
                >
                  {ticks.map((minute) => (
                    <div
                      key={minute}
                      className={cn(
                        "pointer-events-none border-b",
                        minute % 60 === 0 ? "border-border" : "border-border/35",
                      )}
                      style={{ height: SLOT_HEIGHT }}
                    />
                  ))}

                  {hover?.technicianId === technician.id && (
                    <div
                      className="pointer-events-none absolute inset-x-1 z-10 rounded-lg border-2 border-dashed border-primary/70 bg-primary/10"
                      style={{ top: minutesToOffset(hover.start), height: 3 * SLOT_HEIGHT }}
                    />
                  )}

                  {columnBlocks.map((block) => (
                    <div
                      key={block.key}
                      className="absolute inset-x-1 z-10"
                      style={{
                        top: minutesToOffset(block.start),
                        height: Math.max(SLOT_HEIGHT, block.duration * PIXELS_PER_MINUTE) - 3,
                      }}
                    >
                      <BlockCard
                        block={block}
                        compact={block.duration < 55}
                        onOpen={() => onOpenAppointment(block.appointmentId)}
                        onDragStart={(event) => {
                          dragged.current = block;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", block.key);
                        }}
                      />
                    </div>
                  ))}

                  {nowMinutes !== null &&
                    nowMinutes >= DAY_START_MINUTES &&
                    nowMinutes <= DAY_END_MINUTES && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-20 h-0 border-t-2 border-destructive/70"
                        style={{ top: minutesToOffset(nowMinutes) }}
                      />
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1.5 border-t border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
        <Clock className="size-3.5" aria-hidden />
        Drag a card to another technician or time to reassign — snaps to {SLOT_MINUTES} minutes.
        Click empty space to start a new appointment.
      </p>
    </section>
  );
}
