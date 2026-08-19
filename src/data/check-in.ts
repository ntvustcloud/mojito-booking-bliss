import { guestServiceLabel, technicianName, type Appointment, type BookingGuest, type TechnicianBlockout } from "@/data/manager-mock";
import { guestDuration } from "@/data/schedule";
import { technicianRows } from "@/data/technician-state";
import { technicianStation } from "@/data/salon";
import type { CheckInRecord } from "@/data/check-in-store";

/**
 * Customer-facing check-in logic.
 *
 * Everything here answers only the three questions a customer cares about:
 * "is this my appointment?", "am I checked in?" and "where do I go / how long
 * do I wait?". No turn values, no revenue, no queue internals.
 */

export type MatchedAppointment = {
  appointment: Appointment;
  guest: BookingGuest;
  timeLabel: string;
  serviceLabel: string;
  /** Requested technician name, or undefined for "Any Available". */
  technicianLabel?: string;
};

export function digits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/** Match on phone first, then name — plus a generous time window around now. */
export function findMatches(
  appointments: Appointment[],
  name: string,
  phone: string,
  alreadyCheckedIn: CheckInRecord[],
  approxMinutes?: number,
): MatchedAppointment[] {
  const phoneKey = digits(phone);
  const nameKey = name.trim().toLowerCase();
  const taken = new Set(
    alreadyCheckedIn
      .filter((record) => record.kind === "Appointment")
      .map((record) => `${record.appointmentId}:${record.guestId}`),
  );

  const results: MatchedAppointment[] = [];

  for (const appointment of appointments) {
    const phoneHit = phoneKey.length >= 7 && digits(appointment.phone) === phoneKey;
    const nameHit =
      nameKey.length >= 2 &&
      (appointment.title.toLowerCase().includes(nameKey) ||
        appointment.primaryContact.toLowerCase().includes(nameKey) ||
        appointment.guests.some((guest) => guest.name.toLowerCase().includes(nameKey)));
    if (!phoneHit && !nameHit) continue;
    if (approxMinutes !== undefined && Math.abs(appointment.minutes - approxMinutes) > 120) continue;

    for (const guest of appointment.guests) {
      if (guest.status === "Cancelled") continue;
      if (taken.has(`${appointment.id}:${guest.id}`)) continue;
      // On a name-only match, prefer the guest whose own name matches.
      if (!phoneHit && nameKey.length >= 2) {
        const guestNameHit = guest.name.toLowerCase().includes(nameKey);
        const partyHit = appointment.title.toLowerCase().includes(nameKey);
        if (!guestNameHit && !partyHit) continue;
      }
      results.push({
        appointment,
        guest,
        timeLabel: appointment.time,
        serviceLabel: guestServiceLabel(guest),
        ...(guest.technicianId !== "any"
          ? { technicianLabel: technicianName(guest.technicianId) }
          : {}),
      });
    }
  }

  return results.sort((a, b) => a.appointment.minutes - b.appointment.minutes);
}

/** Friendly, deliberately fuzzy wait window. */
export function waitRangeLabel(minutes: number): string {
  if (minutes <= 8) return "About 5–10 minutes";
  if (minutes <= 16) return "About 10–15 minutes";
  if (minutes <= 25) return "About 15–20 minutes";
  if (minutes <= 35) return "About 20–30 minutes";
  if (minutes <= 50) return "About 30–45 minutes";
  return "About 45–60 minutes";
}

export type CheckInOutcome =
  | { ready: true; technicianLabel: string; station: number }
  | { ready: false; waitLabel: string; technicianLabel?: string };

export type OutcomeInput = {
  appointments: Appointment[];
  blockouts: TechnicianBlockout[];
  now: number;
  /** Requested technician id, "any", or undefined for a walk-in. */
  technicianId?: string;
  /** Scheduled start for an appointment check-in. */
  scheduledMinutes?: number;
  /** Service length of the arriving guest, for queue estimates. */
  serviceMinutes?: number;
  /** How many people are already waiting without a technician. */
  queueAhead: number;
};

/**
 * Prototype estimate only. It reads the same schedule the manager board reads
 * (bookings, block time, technician state) but never exposes any of it.
 */
export function checkInOutcome(input: OutcomeInput): CheckInOutcome {
  const { appointments, blockouts, now, technicianId, scheduledMinutes, queueAhead } = input;
  const rows = technicianRows(appointments, blockouts, now);

  // Specific technician requested.
  if (technicianId && technicianId !== "any") {
    const row = rows.find((item) => item.id === technicianId);
    const station = technicianStation(technicianId);
    const dueSoon = scheduledMinutes === undefined || scheduledMinutes <= now + 10;

    if (row?.state === "Available" && dueSoon && station) {
      return { ready: true, technicianLabel: row.name, station };
    }

    const freeIn = row?.freeAt !== undefined ? Math.max(0, row.freeAt - now) : 10;
    const startsIn = scheduledMinutes !== undefined ? Math.max(0, scheduledMinutes - now) : 0;
    return {
      ready: false,
      waitLabel: waitRangeLabel(Math.max(freeIn, startsIn, 5)),
      ...(row ? { technicianLabel: row.name } : {}),
    };
  }

  // Any available technician / walk-in — depends on open chairs and the queue.
  const freeNow = rows.filter((row) => row.state === "Available").length;
  const soonest = rows.reduce((best, row) => {
    if (row.state === "Available") return 0;
    const freeIn = row.freeAt !== undefined ? Math.max(0, row.freeAt - now) : 20;
    return Math.min(best, freeIn);
  }, 60);

  const base = freeNow > 0 ? 10 : Math.max(10, soonest);
  const queuePenalty = Math.max(0, queueAhead - freeNow) * 5;
  // Appointments keep their priority: booked guests skip the walk-in penalty.
  const isBookedAnyTech = scheduledMinutes !== undefined;
  const estimate = isBookedAnyTech ? base + Math.min(queuePenalty, 5) : base + queuePenalty + 5;

  return { ready: false, waitLabel: waitRangeLabel(estimate) };
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
