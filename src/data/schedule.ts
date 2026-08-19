import {
  bookingType,
  guestScheduledMinutes,
  guestServiceLabel,
  guestServiceValue,

  type Appointment,
  type AppointmentStatus,
  type BookingGuest,
  type BookingType,
  type TechnicianBlockout,
} from "@/data/manager-mock";

/**
 * Day-view scheduling primitives.
 *
 * Pure data helpers only — the board component (and a future Calendar page)
 * consume these, so the grid geometry and conflict rules live in one place.
 */

export const DAY_START_MINUTES = 9 * 60; // 9:00 AM
export const DAY_END_MINUTES = 20 * 60; // 8:00 PM
export const SLOT_MINUTES = 15;
export const PIXELS_PER_MINUTE = 1.6;
export const SLOT_HEIGHT = SLOT_MINUTES * PIXELS_PER_MINUTE;
export const MIN_CARD_MINUTES = 20;

export const TERMINAL_STATUSES: AppointmentStatus[] = ["Cancelled"];


export function slotCount(): number {
  return (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES;
}

export function formatMinutes(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatShortMinutes(minutes: number): string {
  return formatMinutes(minutes).replace(":00", "");
}

export function snapToSlot(minutes: number): number {
  const snapped = Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
  return Math.min(DAY_END_MINUTES - SLOT_MINUTES, Math.max(DAY_START_MINUTES, snapped));
}

export function minutesToOffset(minutes: number): number {
  return (minutes - DAY_START_MINUTES) * PIXELS_PER_MINUTE;
}

export function offsetToMinutes(offset: number): number {
  return DAY_START_MINUTES + offset / PIXELS_PER_MINUTE;
}

export function guestDuration(guest: BookingGuest): number {
  return Math.max(MIN_CARD_MINUTES, guestScheduledMinutes(guest) || 30);
}

/** One person's slot in the day — the atomic unit the board renders and moves. */
export type ScheduleBlock = {
  key: string;
  appointmentId: string;
  guestId: string;
  guestName: string;
  bookingTitle: string;
  isGroup: boolean;
  groupLabel?: string;
  serviceLabel: string;
  technicianId: string;
  /** Set when the customer specifically requested this technician (½ turn). */
  requestedTechnicianId?: string;
  status: AppointmentStatus;
  /** Set once the guest has checked in at the front tablet. */
  arrivedAt?: number;
  /**
   * Original logical time: scheduled time for an appointment, check-in time for
   * a walk-in. Never changed by drag-and-drop, so a card dropped back into
   * Waiting / Unassigned returns to exactly this position.
   */
  anchor: number;
  start: number;
  duration: number;
  /** Service price total for this guest — feeds the fairness Service Total. */
  serviceValue: number;
  bookingType: BookingType;
  source: Appointment["source"];
};


export function buildBlocks(appointments: Appointment[]): ScheduleBlock[] {
  return appointments.flatMap((appointment) =>
    appointment.guests.map((guest) => {
      const group = appointment.guests.length > 1;
      const assigned = guest.technicianId !== "any";
      return {
        key: `${appointment.id}:${guest.id}`,
        appointmentId: appointment.id,
        guestId: guest.id,
        guestName: guest.name,
        bookingTitle: appointment.title,
        isGroup: group,
        ...(group ? { groupLabel: appointment.title } : {}),
        serviceLabel: guestServiceLabel(guest),
        technicianId: guest.technicianId,
        ...(guest.requestedTechnicianId
          ? { requestedTechnicianId: guest.requestedTechnicianId }
          : {}),
        status: guest.status,
        ...(guest.arrivedAtMinutes !== undefined
          ? { arrivedAt: guest.arrivedAtMinutes }
          : {}),
        anchor: appointment.minutes,
        // Unassigned cards always sit on their original logical time.
        start: assigned ? (guest.startMinutes ?? appointment.minutes) : appointment.minutes,
        duration: guestDuration(guest),
        serviceValue: guestServiceValue(guest),
        bookingType: bookingType(appointment),

        source: appointment.source,
      } satisfies ScheduleBlock;
    }),
  );
}

export const isActiveBlock = (block: ScheduleBlock) => !TERMINAL_STATUSES.includes(block.status);

/** Unassigned queue: "any technician" guests who still need a chair. */
export const isQueued = (block: ScheduleBlock) =>
  block.technicianId === "any" && isActiveBlock(block);

/**
 * Waiting now = unassigned and already due (walk-in checked in, or appointment
 * time reached). Inferred from the clock — no manual check-in step.
 */
export const isWaitingNow = (block: ScheduleBlock, now: number | null) =>
  isQueued(block) && now !== null && block.anchor <= now;

/** Future bookings that still need a technician — stay on their timeline slot. */
export const isUpcomingUnassigned = (block: ScheduleBlock, now: number | null) =>
  isQueued(block) && (now === null || block.anchor > now);

/** Minutes a queued guest has been waiting, or null when not due yet. */
export function waitingMinutes(block: ScheduleBlock, now: number | null): number | null {
  if (now === null || block.anchor > now) return null;
  return Math.round(now - block.anchor);
}


/** First blockout (break / off shift) overlapping the proposed placement. */
export function findBlockout(
  blockouts: TechnicianBlockout[],
  technicianId: string,
  start: number,
  duration: number,
): TechnicianBlockout | null {
  const end = start + duration;
  return (
    blockouts.find(
      (blockout) =>
        blockout.technicianId === technicianId && start < blockout.end && end > blockout.start,
    ) ?? null
  );
}

export function blocksForTechnician(
  blocks: ScheduleBlock[],
  technicianId: string,
): ScheduleBlock[] {
  return blocks
    .filter((block) => block.technicianId === technicianId)
    .sort((a, b) => a.start - b.start);
}

/** First block that overlaps the proposed placement, ignoring the moved block. */
export function findConflict(
  blocks: ScheduleBlock[],
  technicianId: string,
  start: number,
  duration: number,
  ignoreKey: string,
): ScheduleBlock | null {
  const end = start + duration;
  return (
    blocksForTechnician(blocks, technicianId).find(
      (block) =>
        block.key !== ignoreKey &&
        isActiveBlock(block) &&
        start < block.start + block.duration &&
        end > block.start,
    ) ?? null
  );
}

/**
 * Real salons run a few minutes over. An overlap up to this many minutes is
 * allowed (shown in amber), anything longer is a genuine double-booking.
 */
export const SMALL_OVERLAP_MINUTES = 15;

/** Largest overlap in minutes the placement would create with existing work. */
export function overlapMinutes(
  blocks: ScheduleBlock[],
  technicianId: string,
  start: number,
  duration: number,
  ignoreKey: string,
): number {
  const end = start + duration;
  return blocksForTechnician(blocks, technicianId)
    .filter((block) => block.key !== ignoreKey && isActiveBlock(block))
    .reduce(
      (worst, block) =>
        Math.max(worst, Math.min(end, block.start + block.duration) - Math.max(start, block.start)),
      0,
    );
}

/** Overlap this already-placed card has with its technician's other cards. */
export function blockOverlapMinutes(blocks: ScheduleBlock[], block: ScheduleBlock): number {
  if (!isActiveBlock(block) || block.technicianId === "any") return 0;
  return Math.max(
    0,
    overlapMinutes(blocks, block.technicianId, block.start, block.duration, block.key),
  );
}

/** Overlap too large to be an acceptable few-minutes run-over. */
export function findHardConflict(
  blocks: ScheduleBlock[],
  technicianId: string,
  start: number,
  duration: number,
  ignoreKey: string,
): ScheduleBlock | null {
  const end = start + duration;
  return (
    blocksForTechnician(blocks, technicianId).find((block) => {
      if (block.key === ignoreKey || !isActiveBlock(block)) return false;
      const overlap = Math.min(end, block.start + block.duration) - Math.max(start, block.start);
      return overlap > SMALL_OVERLAP_MINUTES;
    }) ?? null
  );
}


/** Next free moment for a technician, used in the column header. */
export function nextFreeMinute(blocks: ScheduleBlock[], technicianId: string, now: number): number {
  let cursor = Math.max(now, DAY_START_MINUTES);
  for (const block of blocksForTechnician(blocks, technicianId)) {
    if (!isActiveBlock(block)) continue;
    if (block.start <= cursor && block.start + block.duration > cursor) {
      cursor = block.start + block.duration;
    }
  }
  return cursor;
}

/** Start of the next active appointment for a technician after `from`. */
export function nextBlockStart(
  blocks: ScheduleBlock[],
  technicianId: string,
  from: number,
): number | null {
  const next = blocksForTechnician(blocks, technicianId).find(
    (block) => isActiveBlock(block) && block.start >= from,
  );
  return next ? next.start : null;
}

/* ---------------- Calendar-style overlap lanes ---------------- */

/** Max side-by-side lanes before extra overlaps collapse into a "+N more" hint. */
export const MAX_LANES = 4;

export type LanePlacement = {
  /** 0-based horizontal lane index. */
  lane: number;
  /** How many lanes the card's overlap cluster is divided into. */
  lanes: number;
  /** Overlapping cards in the same cluster that did not fit into a lane. */
  hiddenCount: number;
};

type Placeable = { key: string; start: number; duration: number };

/**
 * Assigns each item a lane so overlapping items sit side by side instead of on
 * top of each other — the same greedy sweep professional calendars use.
 */
export function layoutLanes<T extends Placeable>(items: T[]): Map<string, LanePlacement> {
  const placements = new Map<string, LanePlacement>();
  const sorted = [...items].sort((a, b) => a.start - b.start || a.duration - b.duration);

  let cluster: T[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: { item: T; lane: number | null }[] = [];
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        if (laneEnds.length < MAX_LANES) {
          lane = laneEnds.length;
          laneEnds.push(item.start + item.duration);
        } else {
          assigned.push({ item, lane: null });
          continue;
        }
      } else {
        laneEnds[lane] = item.start + item.duration;
      }
      assigned.push({ item, lane });
    }
    const lanes = Math.max(1, laneEnds.length);
    const hiddenCount = assigned.filter((entry) => entry.lane === null).length;
    for (const entry of assigned) {
      if (entry.lane === null) continue;
      placements.set(entry.item.key, { lane: entry.lane, lanes, hiddenCount });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.start + item.duration);
  }
  flush();

  return placements;
}

/** Inline geometry for a lane placement, with small gutters between lanes. */
export function laneStyle(
  placement: LanePlacement | undefined,
  gutterPx = 3,
): { left: string; width: string } {
  const lanes = placement?.lanes ?? 1;
  const lane = placement?.lane ?? 0;
  if (lanes <= 1) return { left: "0px", width: "100%" };
  return {
    left: `calc(${(lane / lanes) * 100}% + ${lane === 0 ? 0 : gutterPx / 2}px)`,
    width: `calc(${100 / lanes}% - ${gutterPx}px)`,
  };
}
