import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Coffee,
  Footprints,
  Star,
  Triangle,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ScheduleBlock } from "@/data/schedule";
import type { AppointmentStatus } from "@/data/manager-mock";

/**
 * One shared visual language for the Live Schedule Board.
 *
 * Every board state is COLOR + ICON + TEXT — never color alone. Appointment
 * status lives on the card surface (background / border); technician
 * recommendation lives on the column outline during drag, so the two systems
 * never get confused.
 */

/** Prototype early-arrival window: inside this many minutes before the
 * appointment, a checked-in guest gets appointment priority. */
export const EARLY_ARRIVAL_WINDOW = 15;

export type BoardState =
  | "scheduled"
  | "early"
  | "appointment-ready"
  | "assigned"
  | "walkin-waiting"
  | "in-service"
  | "completed"
  | "cancelled"
  | "no-show";

export type StateVisual = {
  label: string;
  icon: LucideIcon;
  /** Card surface classes (background + text + border). */
  card: string;
  /** Small swatch classes used in the Color Guide. */
  swatch: string;
  /** Status dot inside the card footer. */
  dot: string;
  meaning: string;
};

export const BOARD_STATES: Record<BoardState, StateVisual> = {
  scheduled: {
    label: "Scheduled",
    icon: CalendarDays,
    card: "bg-status-info-bg/45 text-status-info-fg border-status-info-fg/25",
    swatch: "bg-status-info-bg/45 border-status-info-fg/30 text-status-info-fg",
    dot: "bg-status-info-fg/50",
    meaning: "Has an appointment, not checked in yet.",
  },
  early: {
    label: "Arrived Early",
    icon: Clock3,
    card: "bg-status-info-bg/25 text-status-info-fg border-dashed border-status-info-fg/35",
    swatch: "bg-status-info-bg/25 border-dashed border-status-info-fg/35 text-status-info-fg",
    dot: "bg-status-info-fg/40",
    meaning: `Appointment guest arrived more than ${EARLY_ARRIVAL_WINDOW} min early — ready if capacity allows.`,
  },
  "appointment-ready": {
    label: "Checked In · Appointment",
    icon: CheckCircle2,
    card: "bg-status-info-bg text-status-info-fg border-status-info-fg/55 ring-1 ring-inset ring-status-info-fg/30",
    swatch: "bg-status-info-bg border-status-info-fg/55 text-status-info-fg",
    dot: "bg-status-info-fg",
    meaning: "Appointment guest is here and inside their service window — priority over walk-ins.",
  },
  assigned: {
    label: "Assigned",
    icon: Check,
    card: "bg-status-info-bg/70 text-status-info-fg border-status-info-fg/40",
    swatch: "bg-status-info-bg/70 border-status-info-fg/40 text-status-info-fg",
    dot: "bg-status-info-fg/80",
    meaning: "Guest has a technician and a chair, service not started.",
  },
  "walkin-waiting": {
    label: "Walk-In · Waiting",
    icon: Footprints,
    card: "bg-status-warn-bg text-status-warn-fg border-status-warn-fg/40",
    swatch: "bg-status-warn-bg border-status-warn-fg/40 text-status-warn-fg",
    dot: "bg-status-warn-fg",
    meaning: "No appointment — waiting for the next available technician.",
  },
  "in-service": {
    label: "In Service",
    icon: Circle,
    card: "bg-status-live-bg text-status-live-fg border-status-live-fg/40",
    swatch: "bg-status-live-bg border-status-live-fg/40 text-status-live-fg",
    dot: "bg-status-live-fg",
    meaning: "Technician is working on this guest right now.",
  },
  completed: {
    label: "Completed",
    icon: Check,
    card: "bg-status-done-bg text-status-done-fg border-status-done-fg/25",
    swatch: "bg-status-done-bg border-status-done-fg/30 text-status-done-fg",
    dot: "bg-status-done-fg/60",
    meaning: "Service finished.",
  },
  cancelled: {
    label: "Cancelled",
    icon: X,
    card: "bg-status-off-bg text-status-off-fg border-status-off-fg/30 opacity-75",
    swatch: "bg-status-off-bg border-status-off-fg/30 text-status-off-fg",
    dot: "bg-status-off-fg/70",
    meaning: "Appointment was cancelled.",
  },
  "no-show": {
    label: "No Show",
    icon: AlertTriangle,
    card: "bg-status-off-bg text-status-off-fg border-status-off-fg/30 opacity-75",
    swatch: "bg-status-off-bg border-status-off-fg/40 text-status-off-fg",
    dot: "bg-status-off-fg",
    meaning: "Guest never arrived for the appointment.",
  },
};

export const BLOCKOUT_VISUALS = [
  {
    key: "break",
    label: "Break",
    icon: Coffee,
    swatch:
      "bg-muted/80 border-dashed border-border text-muted-foreground bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgb(0_0_0/0.05)_5px,rgb(0_0_0/0.05)_10px)]",
    meaning: "Technician is temporarily unavailable — can't take a drop.",
  },
  {
    key: "off",
    label: "Unavailable / Off",
    icon: Ban,
    swatch:
      "bg-muted border-dashed border-border text-muted-foreground bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgb(0_0_0/0.07)_5px,rgb(0_0_0/0.07)_10px)]",
    meaning: "Not working this time — no appointments accepted.",
  },
] as const;

/** Drag-and-drop technician recommendation language (separate from status). */
export const RECOMMENDATION_VISUALS = [
  {
    key: "best",
    label: "Recommended",
    icon: Star,
    swatch: "bg-primary/15 border-primary/50 text-primary",
    meaning: "Best fit by turn priority, availability and open time.",
  },
  {
    key: "eligible",
    label: "Available",
    icon: Check,
    swatch: "bg-status-live-bg/50 border-status-live-fg/35 text-status-live-fg",
    meaning: "Eligible to take this guest, just not next in turn.",
  },
  {
    key: "limited",
    label: "Limited",
    icon: Triangle,
    swatch: "bg-status-warn-bg/60 border-status-warn-fg/40 text-status-warn-fg",
    meaning: "Possible, but timing is tight before their next appointment.",
  },
  {
    key: "ineligible",
    label: "Unavailable",
    icon: Ban,
    swatch: "bg-muted border-border text-muted-foreground",
    meaning: "In service, on break, off, or not enough open time.",
  },
] as const;

const TERMINAL: Partial<Record<AppointmentStatus, BoardState>> = {
  Completed: "completed",
  Cancelled: "cancelled",
  "No Show": "no-show",
  "In Service": "in-service",
  Scheduled: "scheduled",
  Assigned: "assigned",
};

/**
 * Board state for one guest block. `now` drives the early-arrival window, so a
 * 3:00 PM guest who checked in at 2:20 PM reads "Arrived Early" until 2:45 PM.
 */
export function boardState(block: ScheduleBlock, now: number | null): BoardState {
  const terminal = TERMINAL[block.status];
  if (terminal) return terminal;

  // Waiting / Checked In — the entry route decides the language.
  if (block.source === "Walk-In") return "walkin-waiting";
  const reference = now ?? block.start;
  return reference >= block.start - EARLY_ARRIVAL_WINDOW ? "appointment-ready" : "early";
}

export function stateVisual(block: ScheduleBlock, now: number | null): StateVisual {
  return BOARD_STATES[boardState(block, now)];
}

/** Scheduled appointments inside their window outrank plain walk-ins. */
export function queuePriority(block: ScheduleBlock, now: number | null): number {
  const state = boardState(block, now);
  if (state === "appointment-ready") return 0;
  if (state === "early") return 1;
  return 2;
}
