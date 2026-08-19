import {
  guestServiceLabel,
  technicianName,
  type Appointment,
  type BookingGuest,
  type TechnicianBlockout,
} from "@/data/manager-mock";
import { guestDuration } from "@/data/schedule";
import { technicianRows } from "@/data/technician-state";
import { technicianStation } from "@/data/salon";
import type { CheckInRecord } from "@/data/check-in-store";

/**
 * Kiosk logic for the entrance tablet.
 *
 * Phone number is the primary lookup key. Nothing here exposes turns, revenue,
 * queue order or other customers — the customer only ever learns whether they
 * are checked in, roughly how long the wait is, and which technician/station
 * belongs to them.
 */

export type MatchedAppointment = {
  appointment: Appointment;
  guest: BookingGuest;
  timeLabel: string;
  serviceLabel: string;
  /** Requested technician name, or undefined for "Any Available Technician". */
  technicianLabel?: string;
  /** Station of the requested technician, purely informational. */
  station?: number;
};

export function digits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export function formatPhone(value: string): string {
  const raw = value.replace(/\D/g, "").slice(0, 10);
  if (raw.length <= 3) return raw;
  if (raw.length <= 6) return `(${raw.slice(0, 3)}) ${raw.slice(3)}`;
  return `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
}

export const phoneReady = (value: string) => digits(value).length >= 7;

function toMatch(appointment: Appointment, guest: BookingGuest): MatchedAppointment {
  const requested = guest.requestedTechnicianId ?? (guest.technicianId !== "any" ? guest.technicianId : undefined);
  const station = requested ? technicianStation(requested) : undefined;
  return {
    appointment,
    guest,
    timeLabel: appointment.time,
    serviceLabel: guestServiceLabel(guest),
    ...(requested ? { technicianLabel: technicianName(requested) } : {}),
    ...(station ? { station } : {}),
  };
}

function alreadyIn(records: CheckInRecord[]): Set<string> {
  return new Set(
    records
      .filter((record) => record.kind === "Appointment")
      .map((record) => `${record.appointmentId}:${record.guestId}`),
  );
}

/** Primary lookup: phone only. Returns every guest on every matching booking. */
export function findByPhone(
  appointments: Appointment[],
  phone: string,
  records: CheckInRecord[],
): MatchedAppointment[] {
  const key = digits(phone);
  if (key.length < 7) return [];
  const taken = alreadyIn(records);
  const results: MatchedAppointment[] = [];

  for (const appointment of appointments) {
    if (appointment.source === "Walk-In") continue;
    if (digits(appointment.phone) !== key) continue;
    for (const guest of appointment.guests) {
      if (guest.status === "Cancelled") continue;
      if (taken.has(`${appointment.id}:${guest.id}`)) continue;
      results.push(toMatch(appointment, guest));
    }
  }

  return results.sort((a, b) => a.appointment.minutes - b.appointment.minutes);
}

/** Fallback lookup when the phone found nothing: name + approximate time. */
export function findByNameAndTime(
  appointments: Appointment[],
  name: string,
  approxMinutes: number | undefined,
  records: CheckInRecord[],
): MatchedAppointment[] {
  const nameKey = name.trim().toLowerCase();
  if (nameKey.length < 2) return [];
  const taken = alreadyIn(records);
  const results: MatchedAppointment[] = [];

  for (const appointment of appointments) {
    if (appointment.source === "Walk-In") continue;
    if (approxMinutes !== undefined && Math.abs(appointment.minutes - approxMinutes) > 90) continue;
    const partyHit = appointment.title.toLowerCase().includes(nameKey);
    for (const guest of appointment.guests) {
      if (guest.status === "Cancelled") continue;
      if (taken.has(`${appointment.id}:${guest.id}`)) continue;
      if (!partyHit && !guest.name.toLowerCase().includes(nameKey)) continue;
      results.push(toMatch(appointment, guest));
    }
  }

  return results.sort((a, b) => a.appointment.minutes - b.appointment.minutes);
}

/** Parse "2", "2 pm", "2:30", "14:30" into minutes from midnight. */
export function parseApproxTime(value: string): number | undefined {
  const text = value.trim().toLowerCase();
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(text);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const suffix = match[3];
  if (hour > 23 || minute > 59) return undefined;
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  // Salon hours are daytime: bare "2" means 2 PM.
  if (!suffix && hour >= 1 && hour <= 8) hour += 12;
  return hour * 60 + minute;
}

/**
 * Deliberately broad wait bands. Never a precise number — the board cannot
 * know whether a chair has actually been cleared.
 */
export function waitBandLabel(minutes: number): string {
  if (minutes <= 5) return "About 0–5 minutes";
  if (minutes <= 10) return "About 5–10 minutes";
  if (minutes <= 20) return "About 10–20 minutes";
  if (minutes <= 30) return "About 20–30 minutes";
  return "30+ minutes";
}

export type WaitEstimate =
  | { known: true; label: string }
  /** Low confidence — we say a person will help instead of guessing. */
  | { known: false; label: string };

export type EstimateInput = {
  appointments: Appointment[];
  blockouts: TechnicianBlockout[];
  now: number;
  /** Requested technician id, or undefined for any-tech / walk-in. */
  technicianId?: string;
  /** Scheduled start when this is a booked appointment. */
  scheduledMinutes?: number;
  /** People already waiting without a chair. */
  queueAhead: number;
  /** Walk-in service length, used to keep the estimate conservative. */
  serviceMinutes?: number;
};

export function estimateWait(input: EstimateInput): WaitEstimate {
  const { appointments, blockouts, now, technicianId, scheduledMinutes, queueAhead } = input;
  const rows = technicianRows(appointments, blockouts, now);
  const isBooked = scheduledMinutes !== undefined;

  if (technicianId && technicianId !== "any") {
    const row = rows.find((item) => item.id === technicianId);
    if (!row || row.state === "Off") return { known: false, label: "A team member will assist you shortly." };
    const freeIn = row.freeAt !== undefined ? Math.max(0, row.freeAt - now) : 15;
    const startsIn = isBooked ? Math.max(0, scheduledMinutes - now) : 0;
    return { known: true, label: waitBandLabel(Math.max(freeIn, startsIn)) };
  }

  const freeNow = rows.filter((row) => row.state === "Available").length;
  const soonest = rows.reduce((best, row) => {
    if (row.state === "Available") return 0;
    const freeIn = row.freeAt !== undefined ? Math.max(0, row.freeAt - now) : 25;
    return Math.min(best, freeIn);
  }, 60);

  const base = freeNow > 0 ? 5 : Math.max(10, soonest);
  const queuePenalty = Math.max(0, queueAhead - freeNow) * 5;
  // Booked guests keep their priority over ordinary walk-ins.
  const estimate = isBooked
    ? Math.max(base, scheduledMinutes - now) + Math.min(queuePenalty, 5)
    : base + queuePenalty + 5;

  if (!isBooked && estimate > 45) return { known: false, label: "A team member will assist you shortly." };
  return { known: true, label: waitBandLabel(estimate) };
}

/** Approximate service length used for walk-in estimates. */
export function walkInMinutes(serviceIds: string[]): number {
  return guestDuration({
    id: "kiosk",
    name: "kiosk",
    serviceIds,
    technicianId: "any",
    status: "Scheduled",
  });
}
