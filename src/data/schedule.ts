import {
  guestServices,
  guestServiceLabel,
  type Appointment,
  type AppointmentStatus,
  type BookingGuest,
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

export const TERMINAL_STATUSES: AppointmentStatus[] = ["Completed", "Cancelled", "No Show"];

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
  const total = guestServices(guest).reduce((sum, service) => sum + service.duration, 0);
  return Math.max(MIN_CARD_MINUTES, total || 30);
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
  status: AppointmentStatus;
  start: number;
  duration: number;
  source: Appointment["source"];
};

export function buildBlocks(appointments: Appointment[]): ScheduleBlock[] {
  return appointments.flatMap((appointment) =>
    appointment.guests.map((guest) => {
      const group = appointment.guests.length > 1;
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
        status: guest.status,
        start: guest.startMinutes ?? appointment.minutes,
        duration: guestDuration(guest),
        source: appointment.source,
      } satisfies ScheduleBlock;
    }),
  );
}

export const isActiveBlock = (block: ScheduleBlock) => !TERMINAL_STATUSES.includes(block.status);

/** Unassigned queue: "any technician" guests who still need a chair. */
export const isQueued = (block: ScheduleBlock) =>
  block.technicianId === "any" && isActiveBlock(block);

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
