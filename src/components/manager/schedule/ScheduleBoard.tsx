import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, Footprints, Heart, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  queuePriority,
  stateVisual,
  RECOMMENDATION_VISUALS,
} from "@/components/manager/schedule/scheduleTone";

import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  PIXELS_PER_MINUTE,
  SLOT_HEIGHT,
  SLOT_MINUTES,
  buildBlocks,
  findBlockout,
  blockOverlapMinutes,
  findHardConflict,
  formatMinutes,
  formatShortMinutes,
  isQueued,
  isWaitingNow,

  laneStyle,
  layoutLanes,
  minutesToOffset,
  nextBlockStart,
  nextFreeMinute,
  offsetToMinutes,
  slotCount,
  snapToSlot,
  waitingMinutes,
  type ScheduleBlock,
} from "@/data/schedule";

/** Placeholder key for the drag preview card inside a column's lane layout. */
const GHOST_KEY = "__drag-preview__";
/** Small downward step so queue cards read as check-in order 1, 2, 3… */
const QUEUE_STAGGER = 6;
import { TurnPriorityBadge } from "@/components/manager/schedule/TurnPriorityBadge";
import { TurnSuggestion } from "@/components/manager/schedule/TurnSuggestion";
import { TurnStrip } from "@/components/manager/schedule/TurnStrip";
import { BlockTimeStripe } from "@/components/manager/schedule/BlockTimeStripe";
import {
  evaluateCandidates,
  serviceTotals,
  turnOrder,
  turnPositions,
  turnTotals,
  type TechnicianCheckIn,
  type TurnCandidate,
  type TurnEvent,
  type TurnQuality,
} from "@/data/turn-system";
import {
  formatServiceMoney,
  formatTurns,
  technicianName,
  type Appointment,
  type TechnicianBlockout,
  type TechnicianRow,
} from "@/data/manager-mock";


/** What kind of change a drop represents — the route decides what to confirm. */
export type MoveKind = "assign" | "reassign" | "unassign" | "retime";

export type MoveRequest = {
  block: ScheduleBlock;
  technicianId: string;
  start: number;
  kind: MoveKind;
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

/** Compact "can this tech take a walk-in?" line under the technician name. */
function availabilityLine(
  technician: TechnicianRow,
  blocks: ScheduleBlock[],
  blockouts: TechnicianBlockout[],
  now: number | null,
): string {
  const from = now ?? DAY_START_MINUTES;
  if (technician.state === "Off") return "Off today";
  if (technician.state === "Break") {
    const current = blockouts.find(
      (blockout) => blockout.kind === "Break" && from >= blockout.start && from < blockout.end,
    );
    const back = current?.end ?? blockouts.find((blockout) => blockout.start >= from)?.end;
    return back ? `Back at ${formatShortMinutes(back)}` : "On break";
  }
  if (technician.state === "In Service") {
    const free = nextFreeMinute(blocks, technician.id, from);
    return free > from ? `Free around ${formatShortMinutes(free)}` : "Wrapping up";
  }
  const next = nextBlockStart(blocks, technician.id, from);
  const nextBreak = blockouts.find((blockout) => blockout.start >= from);
  if (next !== null) return `Next ${formatShortMinutes(next)}`;
  if (nextBreak) return `Open until ${formatShortMinutes(nextBreak.start)}`;
  return "Open rest of day";
}

function BlockCard({
  block,
  compact,
  dense,
  hiddenCount = 0,
  overlap = 0,
  waitedFor,
  now,
  onOpen,
  onDragStart,
}: {
  block: ScheduleBlock;
  compact?: boolean;
  /** Narrow lane: tighten padding and drop non-essential text. */
  dense?: boolean;
  /** Overlapping cards in this cluster that didn't fit into a lane. */
  hiddenCount?: number;
  /** Minutes this card overlaps the technician's neighbouring work. */
  overlap?: number;
  waitedFor?: number | null;
  now: number | null;
  onOpen: () => void;
  onDragStart: (event: React.DragEvent) => void;
}) {
  const visual = stateVisual(block);
  const StateIcon = visual.icon;
  const isWalkIn = block.source === "Walk-In";
  const inQueue = waitedFor !== undefined;
  const overlapped = overlap > 0 && block.status !== "Cancelled";
  const requested = block.requestedTechnicianId === block.technicianId;
  const longWait = waitedFor !== undefined && waitedFor !== null && waitedFor >= 15;

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      {...(overlapped
        ? { title: `${overlap} min overlap with previous appointment` }
        : {})}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-lg border px-2 py-1 text-left leading-tight shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-md",
        dense && "px-1 py-0.5",
        block.isGroup &&
          cn(
            "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
            groupAccent(block.appointmentId),
          ),
        block.isGroup && (dense ? "pl-1.5" : "pl-2.5"),
        visual.card,
        overlapped &&
          "bg-status-warn-bg text-status-warn-fg border-status-warn-fg/50",
      )}
    >
      {/* Requested technician — always top-right, always red. ½ turn. */}
      {requested && (
        <span
          className="absolute top-0.5 right-1 z-20 leading-none"
          title={`Requested Technician · ½ Turn — customer specifically asked for ${technicianName(block.technicianId)}`}
        >
          <Heart
            className="size-3.5 shrink-0 fill-red-600 text-red-600 drop-shadow-[0_0_1px_rgb(255_255_255/0.9)]"
            aria-label={`Requested technician ${technicianName(block.technicianId)} · ½ turn`}
          />
        </span>
      )}
      <span
        className={cn(
          "flex items-center gap-1 overflow-hidden text-[10px] font-extrabold tracking-wide whitespace-nowrap opacity-85",
          requested && "pr-4",
        )}
      >
        {isWalkIn ? (
          <>
            <Footprints className="size-3 shrink-0" aria-hidden />
            <span className="truncate">
              {inQueue ? `Checked in ${formatShortMinutes(block.anchor)}` : "Walk-In"}
            </span>
          </>
        ) : (
          <>
            <CalendarDays className="size-3 shrink-0" aria-hidden />
            <span className="truncate">
              {inQueue
                ? `Appt ${formatShortMinutes(block.anchor)}`
                : dense
                  ? formatShortMinutes(block.start)
                  : `${formatShortMinutes(block.start)}–${formatShortMinutes(block.start + block.duration)}`}
            </span>
          </>
        )}

        {block.isGroup && <Users className="size-3 shrink-0" aria-hidden />}
        {hiddenCount > 0 && (
          <span
            title={`${hiddenCount} more overlapping appointment${hiddenCount > 1 ? "s" : ""} in this time range`}
            className="ml-auto shrink-0 rounded bg-background/70 px-1 text-[9px] font-extrabold"
          >
            +{hiddenCount}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-xs font-extrabold">{block.guestName}</span>
      </span>
      {!compact && (
        <span className="truncate text-[11px] leading-tight opacity-85">{block.serviceLabel}</span>
      )}
      {isWalkIn && inQueue && (
        <span className="truncate text-[10px] font-bold opacity-85">
          Checked in {formatShortMinutes(block.anchor)}
        </span>
      )}
      <span className="mt-auto flex flex-wrap items-center gap-x-1 text-[10px] font-bold">
        <StateIcon className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{visual.label}</span>
        {waitedFor !== undefined && waitedFor !== null && (
          <span className={cn("opacity-80", longWait && "font-extrabold opacity-100")}>
            · Waiting {waitedFor} min
          </span>
        )}
        {block.technicianId === "any" && !isWalkIn && (
          <span className="opacity-70">· Any tech</span>
        )}
        {block.arrivedAt !== undefined && (
          <span
            className="opacity-90"
            title={`Checked in at the front tablet · ${formatShortMinutes(block.arrivedAt)}`}
          >
            · ● Arrived
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * One shared 15-minute grid, rendered identically in every column so a time
 * traces horizontally across the whole board. Full hours read stronger.
 */
function TimeGrid({ ticks }: { ticks: number[] }) {
  return (
    <>
      {ticks.map((minute) => (
        <div
          key={minute}
          className={cn(
            "pointer-events-none border-t",
            minute % 60 === 0 ? "border-border" : "border-border/30",
          )}
          style={{
            height: SLOT_HEIGHT,
            ...(minute % 60 === 0 ? { borderTopWidth: 2 } : {}),
          }}
        />
      ))}
    </>
  );
}


export function ScheduleBoard({
  appointments,
  technicians,
  blockouts,
  turnEvents,
  checkIns,
  nowMinutes,
  onOpenAppointment,
  onMove,
  onCreateAt,
  onEditBlockTime,
  onAdjustBlockTime,
  registerScrollToNow,
}: {
  appointments: Appointment[];
  technicians: TechnicianRow[];
  blockouts: TechnicianBlockout[];
  turnEvents: TurnEvent[];
  checkIns: TechnicianCheckIn[];
  nowMinutes: number | null;
  onOpenAppointment: (appointmentId: string) => void;
  onMove: (request: MoveRequest) => void;
  onCreateAt: (technicianId: string, start: number) => void;
  onEditBlockTime: (blockout: TechnicianBlockout) => void;
  /** Commit a resize or in-column move of block time. */
  onAdjustBlockTime: (blockout: TechnicianBlockout, start: number, end: number) => void;

  registerScrollToNow?: (scrollToNow: (() => void) | null) => void;
}) {
  const blocks = useMemo(() => buildBlocks(appointments), [appointments]);
  /** Everything still needing a chair, ordered by its own logical time. */
  const queued = useMemo(
    () =>
      blocks
        .filter(isQueued)
        .sort(
          (a, b) =>
            a.anchor - b.anchor ||
            queuePriority(a, nowMinutes) - queuePriority(b, nowMinutes),
        ),
    [blocks, nowMinutes],
  );
  const waitingNow = useMemo(
    () => queued.filter((block) => isWaitingNow(block, nowMinutes)),
    [queued, nowMinutes],
  );
  // Side-by-side lanes for queued cards that share a time range.
  const queuedLanes = useMemo(
    () =>
      layoutLanes(
        queued.map((block) => ({
          key: block.key,
          start: block.anchor,
          duration: block.duration,
        })),
      ),
    [queued],
  );
  /** Tiny downward step so same-time walk-ins read as check-in order 1, 2, 3… */
  const queueStagger = useMemo(() => {
    const map = new Map<string, number>();
    const walkIns = queued.filter((block) => block.source === "Walk-In");
    let anchorStart: number | null = null;
    let order = 0;
    for (const block of walkIns) {
      if (anchorStart === null || block.anchor - anchorStart > 10) {
        anchorStart = block.anchor;
        order = 0;
      } else {
        order += 1;
      }
      map.set(block.key, order * QUEUE_STAGGER);
    }
    return map;
  }, [queued]);
  const dragged = useRef<ScheduleBlock | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ technicianId: string; start: number } | null>(null);
  const [dragging, setDragging] = useState<ScheduleBlock | null>(null);


  // ---- Turn Recommendation System (decision support only) ----
  const totals = useMemo(() => turnTotals(turnEvents), [turnEvents]);
  const revenues = useMemo(() => serviceTotals(turnEvents), [turnEvents]);
  const positions = useMemo(
    () => turnPositions(turnOrder(technicians, checkIns, totals, revenues)),
    [technicians, checkIns, totals, revenues],
  );


  const candidatesFor = useCallback(
    (block: ScheduleBlock): TurnCandidate[] =>
      evaluateCandidates({
        technicians,
        blocks,
        blockouts,
        checkIns,
        events: turnEvents,
        start: isWaitingNow(block, nowMinutes)
          ? snapToSlot(Math.max(nowMinutes ?? block.start, block.start))
          : block.start,
        duration: block.duration,
        serviceLabel: block.serviceLabel,
        ignoreKey: block.key,
        requestedTechnicianId: block.requestedTechnicianId,
        now: nowMinutes,
      }),
    [technicians, blocks, blockouts, checkIns, turnEvents, nowMinutes],
  );

  const suggestions = useMemo(() => {
    const map = new Map<string, TurnCandidate[]>();
    for (const block of queued) map.set(block.key, candidatesFor(block));
    return map;
  }, [queued, candidatesFor]);


  // Drag highlight: recommendation quality per technician column.
  const dragQuality = useMemo(() => {
    const map = new Map<string, TurnQuality>();
    if (!dragging) return map;
    for (const candidate of candidatesFor(dragging)) {
      map.set(candidate.technicianId, candidate.quality);
    }
    return map;
  }, [dragging, candidatesFor]);

  const qualityTint = (technicianId: string) => {
    const quality = dragQuality.get(technicianId);
    if (!quality) return undefined;
    if (quality === "best") return "bg-primary/10 ring-2 ring-inset ring-primary/50";
    if (quality === "eligible")
      return "bg-status-live-bg/45 ring-1 ring-inset ring-status-live-fg/35";
    if (quality === "limited")
      return "bg-status-warn-bg/45 ring-1 ring-inset ring-status-warn-fg/40";
    return "bg-muted/70 opacity-60 ring-1 ring-inset ring-border";
  };

  const totalHeight = slotCount() * SLOT_HEIGHT;
  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let m = DAY_START_MINUTES; m < DAY_END_MINUTES; m += SLOT_MINUTES) list.push(m);
    return list;
  }, []);

  const nowVisible =
    nowMinutes !== null && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES;

  // Scroll so "now" sits just below the header, keeping recent history in view.
  const scrollToNow = useCallback(() => {
    const container = scrollRef.current;
    if (!container || nowMinutes === null) return;
    const target = minutesToOffset(nowMinutes) - 90;
    container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [nowMinutes]);




  useEffect(() => {
    registerScrollToNow?.(nowVisible ? scrollToNow : null);
    return () => registerScrollToNow?.(null);
  }, [registerScrollToNow, scrollToNow, nowVisible]);

  // One-time auto-scroll on open during business hours.
  const autoScrolled = useRef(false);
  useEffect(() => {
    if (autoScrolled.current || !nowVisible) return;
    autoScrolled.current = true;
    scrollToNow();
  }, [nowVisible, scrollToNow]);

  const startFromEvent = useCallback((event: React.DragEvent | React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return snapToSlot(offsetToMinutes(event.clientY - rect.top));
  }, []);

  function handleDrop(event: React.DragEvent, technicianId: string) {
    event.preventDefault();
    const block = dragged.current;
    setHover(null);
    setDragging(null);
    dragged.current = null;
    if (!block) return;
    const start = technicianId === "any" ? block.start : startFromEvent(event);
    if (block.technicianId === technicianId && block.start === start) return;

    if (technicianId !== "any") {
      const blocked = findBlockout(blockouts, technicianId, start, block.duration);
      if (blocked) {
        toast.error(
          `${technicianName(technicianId)} is unavailable at this time (${blocked.label} ${formatShortMinutes(blocked.start)}–${formatShortMinutes(blocked.end)}).`,
        );
        return;
      }
      const conflict = findHardConflict(blocks, technicianId, start, block.duration, block.key);
      if (conflict) {
        toast.error(
          `${technicianName(technicianId)} has ${conflict.guestName} at ${formatShortMinutes(conflict.start)}. This service needs about ${block.duration} minutes.`,
        );
        return;
      }
    }

    const kind: MoveKind =
      technicianId === "any"
        ? "unassign"
        : block.technicianId === "any"
          ? "assign"
          : block.technicianId === technicianId
            ? "retime"
            : "reassign";

    onMove({ block, technicianId, start, kind });

  }

  function dragProps(block: ScheduleBlock) {
    return {
      onDragStart: (event: React.DragEvent) => {
        dragged.current = block;
        setDragging(block);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", block.key);
      },
      onDragEnd: () => {
        setDragging(null);
        setHover(null);
      },
    };
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div ref={scrollRef} className="max-h-[calc(100vh-13rem)] overflow-auto">
        <div className="min-w-[68rem]">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `4.5rem 24rem repeat(${technicians.length}, minmax(11rem, 1fr))`,
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
              <p className="text-[11px] font-bold text-status-warn-fg">
                {waitingNow.length} waiting now · {queued.length - waitingNow.length} upcoming
              </p>
            </div>
            {technicians.map((technician) => {
              const techBlockouts = blockouts.filter(
                (blockout) => blockout.technicianId === technician.id,
              );
              return (
                <div
                  key={technician.id}
                  className={cn(
                    "sticky top-0 z-20 border-r border-b border-border bg-muted/70 px-3 py-2 backdrop-blur transition-colors last:border-r-0",
                    qualityTint(technician.id),
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-[10px] font-extrabold text-secondary-foreground">
                      {technician.initials}
                    </span>
                    <p className="truncate text-sm font-extrabold text-foreground">
                      {technician.name}
                    </p>
                    <TurnPriorityBadge
                      technicianId={technician.id}
                      technicianName={technician.name}
                      position={positions[technician.id] ?? technicians.length}
                      total={totals[technician.id] ?? 0}
                      serviceTotal={revenues[technician.id] ?? 0}
                      events={turnEvents}
                      checkIns={checkIns}
                    />
                  </div>
                  {/* Fairness at a glance: turn strip + turns · service total */}
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground">
                    <TurnStrip total={totals[technician.id] ?? 0} />
                    <span className="truncate">
                      {formatTurns(totals[technician.id] ?? 0)}
                      <span className="mx-1 opacity-50">·</span>
                      {formatServiceMoney(revenues[technician.id] ?? 0)} Service
                    </span>
                  </p>

                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        technician.state === "Available" && "bg-status-live-fg",
                        technician.state === "In Service" && "bg-status-info-fg",
                        technician.state === "Break" && "bg-status-warn-fg",
                        technician.state === "Off" && "bg-status-neutral-fg/50",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">
                      {technician.state} ·{" "}
                      {availabilityLine(technician, blocks, techBlockouts, nowMinutes)}
                    </span>
                  </p>
                  {dragQuality.get(technician.id) && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-extrabold">
                      {(() => {
                        const quality = dragQuality.get(technician.id)!;
                        const visual = RECOMMENDATION_VISUALS.find((item) => item.key === quality)!;
                        const Icon = visual.icon;
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded border px-1 py-px",
                              visual.swatch,
                            )}
                          >
                            <Icon className="size-2.5 shrink-0" aria-hidden />
                            {visual.label}
                          </span>
                        );
                      })()}
                    </p>
                  )}

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
                    "relative border-t",
                    minute % 60 === 0 ? "border-border" : "border-border/30",
                  )}
                  style={{
                    height: SLOT_HEIGHT,
                    ...(minute % 60 === 0 ? { borderTopWidth: 2 } : {}),
                  }}
                >
                  {minute % 60 === 0 ? (
                    <span className="absolute top-0.5 right-2 text-[11px] font-extrabold text-muted-foreground">
                      {formatShortMinutes(minute)}
                    </span>
                  ) : minute % 60 === 30 ? (
                    <span className="absolute top-0 right-2 text-[9px] font-bold text-muted-foreground/55">
                      :30
                    </span>
                  ) : null}
                </div>
              ))}
              {nowVisible && (
                <span
                  className="absolute right-1 z-20 -translate-y-1/2 rounded bg-destructive px-1 py-0.5 text-[10px] font-extrabold text-destructive-foreground"
                  style={{ top: minutesToOffset(nowMinutes!) }}
                >
                  {formatMinutes(nowMinutes!)}
                </span>
              )}
            </div>

            {/* Waiting queue + upcoming unassigned column */}
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, "any")}
              className="relative border-r border-border bg-status-warn-bg/20"
              style={{ height: totalHeight }}
            >
              <TimeGrid ticks={ticks} />
              {/* Every queued card sits on its own logical time: appointment
                  scheduled time, walk-in check-in time. No list stacking. */}
              {queued.map((block) => {
                const placement = queuedLanes.get(block.key);
                const laneCount = placement?.lanes ?? 1;
                const stagger = queueStagger.get(block.key) ?? 0;
                return (
                  <div
                    key={block.key}
                    className="absolute inset-x-1 z-10"
                    style={{
                      top: minutesToOffset(block.anchor) + stagger,
                      height: Math.max(56, block.duration * PIXELS_PER_MINUTE - 3),
                    }}
                  >
                    <div className="absolute inset-y-0" style={laneStyle(placement)}>
                      <div className="h-[calc(100%-1.1rem)]">
                        <BlockCard
                          block={block}
                          compact={block.duration < 55 || laneCount >= 3}
                          dense={laneCount >= 3}
                          hiddenCount={
                            placement && placement.lane === laneCount - 1
                              ? placement.hiddenCount
                              : 0
                          }
                          waitedFor={waitingMinutes(block, nowMinutes)}
                          now={nowMinutes}
                          onOpen={() => onOpenAppointment(block.appointmentId)}
                          {...dragProps(block)}
                        />
                      </div>
                      <TurnSuggestion
                        candidates={suggestions.get(block.key) ?? []}
                        className="mt-0.5"
                      />
                    </div>
                  </div>
                );
              })}
              {queued.length === 0 && (
                <p className="absolute inset-x-2 top-2 text-xs text-muted-foreground">
                  Nobody waiting right now.
                </p>
              )}


              {nowVisible && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 h-0 border-t-2 border-destructive/70"
                  style={{ top: minutesToOffset(nowMinutes!) }}
                />
              )}
            </div>

            {/* Technician columns */}
            {technicians.map((technician) => {
              const columnBlocks = blocks.filter((block) => block.technicianId === technician.id);
              const techBlockouts = blockouts.filter(
                (blockout) => blockout.technicianId === technician.id,
              );
              // Live lane preview: fold the dragged card into this column's layout.
              const ghost =
                dragging && hover?.technicianId === technician.id
                  ? {
                      key: GHOST_KEY,
                      start: hover.start,
                      duration: dragging.duration,
                    }
                  : null;
              const laneItems = [
                ...columnBlocks
                  .filter((block) => !(ghost && block.key === dragging?.key))
                  .map((block) => ({
                    key: block.key,
                    start: block.start,
                    duration: block.duration,
                  })),
                ...(ghost ? [ghost] : []),
              ];
              const lanes = layoutLanes(laneItems);
              const ghostPlacement = ghost ? lanes.get(GHOST_KEY) : undefined;
              return (
                <div
                  key={technician.id}
                  data-tech-column={technician.id}

                  className={cn(
                    "relative border-r border-border transition-colors last:border-r-0",
                    qualityTint(technician.id),
                  )}
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
                  <TimeGrid ticks={ticks} />

                  {/* Block time — resizable, movable, click to edit. Never bookable. */}
                  {techBlockouts.map((blockout) => (
                    <BlockTimeStripe
                      key={blockout.id}
                      blockout={blockout}
                      onEdit={() => onEditBlockTime(blockout)}
                      onAdjust={(start, end) => onAdjustBlockTime(blockout, start, end)}
                    />
                  ))}


                  {hover?.technicianId === technician.id && (
                    <div
                      className="pointer-events-none absolute inset-x-1 z-10"
                      style={{
                        top: minutesToOffset(hover.start),
                        height: Math.max(
                          3 * SLOT_HEIGHT,
                          (dragging?.duration ?? 3 * SLOT_MINUTES) * PIXELS_PER_MINUTE - 3,
                        ),
                      }}
                    >
                      <div
                        className={cn(
                          "absolute inset-y-0 rounded-lg border-2 border-dashed",
                          findBlockout(techBlockouts, technician.id, hover.start, 3 * SLOT_MINUTES)
                            ? "border-destructive/70 bg-destructive/10"
                            : "border-primary/70 bg-primary/10",
                        )}
                        style={laneStyle(ghostPlacement)}
                      >
                        {/* Compact snap label so the drop time is unmistakable. */}
                        <span className="absolute -top-2 left-1 rounded bg-primary px-1 py-px text-[10px] font-extrabold text-primary-foreground shadow-sm">
                          {formatMinutes(hover.start)}
                        </span>
                      </div>
                    </div>
                  )}

                  {columnBlocks.map((block) => {
                    const placement = lanes.get(block.key);
                    const laneCount = placement?.lanes ?? 1;
                    return (
                      <div
                        key={block.key}
                        className="absolute inset-x-1 z-10"
                        style={{
                          top: minutesToOffset(block.start),
                          height: Math.max(56, block.duration * PIXELS_PER_MINUTE - 3),
                        }}
                      >
                        <div className="absolute inset-y-0" style={laneStyle(placement)}>
                          <BlockCard
                            block={block}
                            compact={block.duration < 55 || laneCount >= 3}
                            dense={laneCount >= 3}
                            hiddenCount={
                              placement && placement.lane === laneCount - 1
                                ? placement.hiddenCount
                                : 0
                            }
                            overlap={blockOverlapMinutes(blocks, block)}
                            now={nowMinutes}
                            onOpen={() => onOpenAppointment(block.appointmentId)}
                            {...dragProps(block)}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {nowVisible && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 h-0 border-t-2 border-destructive/70"
                      style={{ top: minutesToOffset(nowMinutes!) }}
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
        Click an empty slot to add a booking, drag a card to reassign it (snaps to {SLOT_MINUTES}{" "}
        minutes), and click a block-time stripe to edit it. Turn numbers and ★ suggestions are
        recommendations — you always decide.
      </p>
    </section>
  );
}
