import {
  Ban,
  CalendarDays,
  Check,
  Coffee,
  Footprints,
  Star,
  Triangle,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ScheduleBlock } from "@/data/schedule";

/**
 * One shared visual language for the Live Schedule Board.
 *
 * Deliberately small: a card is either a booked Appointment, a Walk-In, or
 * Cancelled. Block time is grey/striped. Everything else the board needs to
 * say (busy, free, waiting) is inferred from the schedule and the clock, so
 * colour never encodes a manual status step.
 */

export type BoardState = "appointment" | "walkin" | "cancelled";

export type StateVisual = {
  label: string;
  icon: LucideIcon;
  /** Card surface classes (background + text + border). */
  card: string;
  /** Small swatch classes used in the Color Guide. */
  swatch: string;
  meaning: string;
};

export const BOARD_STATES: Record<BoardState, StateVisual> = {
  appointment: {
    label: "Appointment",
    icon: CalendarDays,
    card: "bg-status-info-bg/70 text-status-info-fg border-status-info-fg/40",
    swatch: "bg-status-info-bg/70 border-status-info-fg/40 text-status-info-fg",
    meaning: "Customer booked ahead — online, by phone or at the desk.",
  },
  walkin: {
    label: "Walk-In",
    icon: Footprints,
    card: "bg-status-warn-bg text-status-warn-fg border-status-warn-fg/45",
    swatch: "bg-status-warn-bg border-status-warn-fg/45 text-status-warn-fg",
    meaning: "Customer arrived without a booking — anchored to their check-in time.",
  },
  cancelled: {
    label: "Cancelled",
    icon: X,
    card: "bg-destructive/10 text-destructive border-destructive/30 opacity-70 line-through",
    swatch: "bg-destructive/10 border-destructive/30 text-destructive",
    meaning: "Booking was cancelled. Kept muted on the board for the rest of the day.",
  },
};

export const BLOCKOUT_VISUALS = [
  {
    key: "break",
    label: "Break / Lunch / Personal",
    icon: Coffee,
    swatch:
      "bg-muted/80 border-dashed border-border text-muted-foreground bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgb(0_0_0/0.05)_5px,rgb(0_0_0/0.05)_10px)]",
    meaning: "Block Time — technician is temporarily away and can't take a drop. Click to edit.",
  },
  {
    key: "off",
    label: "Unavailable / Other",
    icon: Ban,
    swatch:
      "bg-muted border-dashed border-border text-muted-foreground bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgb(0_0_0/0.07)_5px,rgb(0_0_0/0.07)_10px)]",
    meaning: "Block Time — not working this stretch. Click the block to edit or delete it.",
  },
] as const;

/** Drag-and-drop technician recommendation language (separate from card colour). */
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
    meaning: "Possible, but timing is tight before their next booking.",
  },
  {
    key: "ineligible",
    label: "Unavailable",
    icon: Ban,
    swatch: "bg-muted border-border text-muted-foreground",
    meaning: "Busy, blocked, or not enough open time for this service.",
  },
] as const;

export function boardState(block: ScheduleBlock): BoardState {
  if (block.status === "Cancelled") return "cancelled";
  return block.bookingType === "Walk-In" ? "walkin" : "appointment";
}

export function stateVisual(block: ScheduleBlock): StateVisual {
  return BOARD_STATES[boardState(block)];
}

/**
 * Waiting order: appointments come before plain walk-ins once their booked time
 * is due (or close). Purely visual decision support — nothing auto-assigns.
 */
export const APPOINTMENT_PRIORITY_WINDOW = 15;

export function queuePriority(block: ScheduleBlock, now: number | null): number {
  if (block.bookingType !== "Appointment") return 1;
  const reference = now ?? block.anchor;
  return reference >= block.anchor - APPOINTMENT_PRIORITY_WINDOW ? 0 : 2;
}
