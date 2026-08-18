import { getService, type Service } from "@/data/services";
import { servicesMinutes } from "@/data/service-durations";
import { technicians } from "@/data/salon";
import type { TechnicianCheckIn, TurnEvent } from "@/data/turn-system";

/**
 * Manager Portal prototype data.
 *
 * Services and technicians come from the SAME shared sources the customer site
 * uses (`@/data/services`, `@/data/salon`). Only the operational layer
 * (today's bookings, technician block time) is mocked here.
 *
 * Operating principle: the board infers activity from the schedule. There is no
 * manual service lifecycle — a booking is either live or cancelled.
 */

export type AppointmentStatus = "Scheduled" | "Cancelled";

/** Appointment = booked ahead. Walk-In = arrived without a booking. */
export type BookingType = "Appointment" | "Walk-In";

/** One person inside a booking. An individual booking has exactly one guest. */
export type BookingGuest = {
  id: string;
  name: string;
  serviceIds: string[];
  /** Technician id from `technicians`, or "any" when still unassigned. */
  technicianId: string;
  /**
   * Set only when the customer specifically requested this technician.
   * A requested booking is worth half a turn.
   */
  requestedTechnicianId?: string;
  status: AppointmentStatus;
  /**
   * Placement on a technician's timeline once assigned. Unassigned guests
   * always fall back to the booking's anchor time (see `Appointment.minutes`),
   * which is how a card returns to its original slot when dragged back to
   * Waiting / Unassigned.
   */
  startMinutes?: number;
};

export type Appointment = {
  id: string;
  /** Display label of the anchor time, e.g. "9:00 AM". */
  time: string;
  /**
   * Anchor time in minutes from midnight: the scheduled time for an
   * appointment, the check-in time for a walk-in. Never overwritten by drag.
   */
  minutes: number;
  /** Booking title — customer name, or party name for groups. */
  title: string;
  primaryContact: string;
  phone: string;
  notes?: string;
  source: "Online" | "Walk-In" | "Phone";
  guests: BookingGuest[];
};

export type TechnicianState = "Available" | "In Service" | "Break" | "Off";

export const bookingType = (appointment: Appointment): BookingType =>
  appointment.source === "Walk-In" ? "Walk-In" : "Appointment";

export const isGroup = (appointment: Appointment) => appointment.guests.length > 1;

export function guestServices(guest: BookingGuest): Service[] {
  return guest.serviceIds
    .map((id) => getService(id))
    .filter((service): service is Service => Boolean(service));
}

export function guestServiceLabel(guest: BookingGuest): string {
  const names = guestServices(guest).map((service) => service.name);
  return names.length > 0 ? names.join(" + ") : "No services yet";
}

/** Scheduled minutes for a guest — driven by the configurable duration map. */
export function guestScheduledMinutes(guest: BookingGuest): number {
  return servicesMinutes(guest.serviceIds);
}

export function technicianName(id: string): string {
  if (id === "any") return "Any Available";
  return technicians.find((technician) => technician.id === id)?.name ?? "Any Available";
}

export function appointmentServiceLabel(appointment: Appointment): string {
  if (isGroup(appointment)) return `${appointment.guests.length} Guests`;
  return guestServiceLabel(appointment.guests[0]!);
}

export function appointmentTechnicianLabel(appointment: Appointment): string {
  const unique = new Set(appointment.guests.map((guest) => guest.technicianId));
  if (unique.size > 1) return "Multiple Techs";
  return technicianName(appointment.guests[0]!.technicianId);
}

export function appointmentTotal(appointment: Appointment): number {
  return appointment.guests.reduce(
    (sum, guest) => sum + guestServices(guest).reduce((inner, s) => inner + s.price, 0),
    0,
  );
}

export function appointmentDuration(appointment: Appointment): number {
  return Math.max(0, ...appointment.guests.map(guestScheduledMinutes));
}

export function appointmentStatus(appointment: Appointment): AppointmentStatus {
  return appointment.guests.every((guest) => guest.status === "Cancelled")
    ? "Cancelled"
    : "Scheduled";
}

export const todayAppointments: Appointment[] = [
  {
    id: "apt-1",
    time: "9:00 AM",
    minutes: 540,
    title: "Sarah Nguyen",
    primaryContact: "Sarah Nguyen",
    phone: "(612) 555-1234",
    source: "Online",
    notes: "Prefers warmer water, sensitive cuticles.",
    guests: [
      {
        id: "g-1",
        name: "Sarah Nguyen",
        serviceIds: ["signature-pedicure"],
        technicianId: "mai",
        requestedTechnicianId: "mai",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-2",
    time: "9:30 AM",
    minutes: 570,
    title: "Jessica Alvarez",
    primaryContact: "Jessica Alvarez",
    phone: "(512) 555-0912",
    source: "Walk-In",
    guests: [
      {
        id: "g-2",
        name: "Jessica Alvarez",
        serviceIds: ["gel-manicure"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-3",
    time: "10:00 AM",
    minutes: 600,
    title: "Emily Carter",
    primaryContact: "Emily Carter",
    phone: "(512) 555-4471",
    source: "Online",
    notes: "Bringing an inspiration photo for shape.",
    guests: [
      {
        id: "g-3",
        name: "Emily Carter",
        serviceIds: ["acrylic-full-set"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-4",
    time: "10:30 AM",
    minutes: 630,
    title: "Sarah's Party",
    primaryContact: "Sarah Nguyen",
    phone: "(612) 555-1234",
    source: "Online",
    notes: "Birthday group — would like to sit together.",
    guests: [
      {
        id: "g-4a",
        name: "Sarah",
        serviceIds: ["signature-pedicure", "gel-manicure"],
        technicianId: "mai",
        requestedTechnicianId: "mai",
        status: "Scheduled",
      },
      {
        id: "g-4b",
        name: "Jessica",
        serviceIds: ["deluxe-pedicure"],
        technicianId: "linh",
        status: "Scheduled",
      },
      {
        id: "g-4c",
        name: "Guest 3",
        serviceIds: ["acrylic-full-set"],
        technicianId: "tran",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-5",
    time: "11:15 AM",
    minutes: 675,
    title: "Priya Raman",
    primaryContact: "Priya Raman",
    phone: "(512) 555-7788",
    source: "Phone",
    guests: [
      {
        id: "g-5",
        name: "Priya Raman",
        serviceIds: ["gel-x-full-set", "nail-art-simple"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-6",
    time: "12:00 PM",
    minutes: 720,
    title: "Daniel Kim",
    primaryContact: "Daniel Kim",
    phone: "(512) 555-2210",
    source: "Online",
    guests: [
      {
        id: "g-6",
        name: "Daniel Kim",
        serviceIds: ["classic-manicure"],
        technicianId: "rosa",
        requestedTechnicianId: "rosa",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-7",
    time: "12:45 PM",
    minutes: 765,
    title: "Hannah Brooks",
    primaryContact: "Hannah Brooks",
    phone: "(512) 555-3390",
    source: "Online",
    guests: [
      {
        id: "g-7",
        name: "Hannah Brooks",
        serviceIds: ["dip-powder"],
        technicianId: "linh",
        requestedTechnicianId: "linh",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-8",
    time: "1:30 PM",
    minutes: 810,
    title: "Sofia Martinez",
    primaryContact: "Sofia Martinez",
    phone: "(512) 555-8823",
    source: "Online",
    guests: [
      {
        id: "g-8",
        name: "Sofia Martinez",
        serviceIds: ["spa-manicure", "paraffin-add-on"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-9",
    time: "2:15 PM",
    minutes: 855,
    title: "Megan Lo",
    primaryContact: "Megan Lo",
    phone: "(512) 555-6641",
    source: "Phone",
    guests: [
      {
        id: "g-9",
        name: "Megan Lo",
        serviceIds: ["gel-pedicure"],
        technicianId: "rosa",
        requestedTechnicianId: "rosa",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-10",
    time: "3:00 PM",
    minutes: 900,
    title: "Ava Chen",
    primaryContact: "Ava Chen",
    phone: "(512) 555-9014",
    source: "Online",
    guests: [
      {
        id: "g-10",
        name: "Ava Chen",
        serviceIds: ["nail-art-detailed", "gel-manicure"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
  {
    id: "apt-11",
    time: "3:45 PM",
    minutes: 945,
    title: "Olivia Reed",
    primaryContact: "Olivia Reed",
    phone: "(512) 555-1177",
    source: "Online",
    guests: [
      {
        id: "g-11",
        name: "Olivia Reed",
        serviceIds: ["express-pedicure"],
        technicianId: "tran",
        status: "Cancelled",
      },
    ],
  },
  {
    id: "apt-12",
    time: "4:30 PM",
    minutes: 990,
    title: "Nina Patel",
    primaryContact: "Nina Patel",
    phone: "(512) 555-4402",
    source: "Online",
    guests: [
      {
        id: "g-12",
        name: "Nina Patel",
        serviceIds: ["acrylic-fill"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
];

/** Working technicians (excludes the customer-facing "any" pseudo option). */
export const workingTechnicians = technicians.filter((technician) => technician.id !== "any");

/* ---------------- Block Time ---------------- */

export const BLOCKOUT_KINDS = ["Break", "Lunch", "Personal", "Unavailable", "Other"] as const;
export type BlockoutKind = (typeof BLOCKOUT_KINDS)[number];

/**
 * Non-bookable stretches of a technician's day — the single source of truth for
 * "this technician is not available". Breaks are just one kind of block time.
 */
export type TechnicianBlockout = {
  id: string;
  technicianId: string;
  kind: BlockoutKind;
  label: string;
  /** Minutes from midnight. */
  start: number;
  end: number;
  note?: string;
};

/** Kinds that read as "temporarily away" rather than "not working". */
export const isBreakKind = (kind: BlockoutKind) =>
  kind === "Break" || kind === "Lunch" || kind === "Personal";

export const technicianBlockouts: TechnicianBlockout[] = [
  { id: "bo-mai-lunch", technicianId: "mai", kind: "Lunch", label: "Lunch", start: 750, end: 780 },
  { id: "bo-linh-lunch", technicianId: "linh", kind: "Break", label: "Break", start: 810, end: 840 },
  { id: "bo-rosa-lunch", technicianId: "rosa", kind: "Lunch", label: "Lunch", start: 720, end: 780 },
  {
    id: "bo-tran-off",
    technicianId: "tran",
    kind: "Unavailable",
    label: "Off shift",
    start: 1020,
    end: 1200,
  },
];

export function blockoutsFor(
  blockouts: TechnicianBlockout[],
  technicianId: string,
): TechnicianBlockout[] {
  return blockouts
    .filter((blockout) => blockout.technicianId === technicianId)
    .sort((a, b) => a.start - b.start);
}

export type TechnicianRow = {
  id: string;
  name: string;
  initials: string;
  state: TechnicianState;
  detail?: string;
  /** Minute the technician becomes free again, when currently busy or blocked. */
  freeAt?: number;
};

/**
 * Mock daily check-in clock. The Turn System uses check-in order as the
 * starting rotation for the day — swap for a real staff check-in feed later.
 */
export const technicianCheckIns: TechnicianCheckIn[] = [
  { technicianId: "mai", atMinutes: 520 }, // 8:40 AM
  { technicianId: "linh", atMinutes: 525 }, // 8:45 AM
  { technicianId: "tran", atMinutes: 532 }, // 8:52 AM
  { technicianId: "rosa", atMinutes: 540 }, // 9:00 AM
];

/** Turn ledger for the day so far (check-ins + accepted customers). */
export const initialTurnEvents: TurnEvent[] = [
  ...technicianCheckIns.map((checkIn) => ({
    id: `chk-${checkIn.technicianId}`,
    technicianId: checkIn.technicianId,
    atMinutes: checkIn.atMinutes,
    kind: "Check In" as const,
    value: 0,
    label: "Checked in",
  })),
  {
    id: "turn-mai-1",
    technicianId: "mai",
    atMinutes: 545,
    kind: "Requested",
    value: 0.5,
    label: "Sarah requested Mai",
  },
  {
    id: "turn-linh-1",
    technicianId: "linh",
    atMinutes: 630,
    kind: "Salon Assigned",
    value: 1,
    label: "Jessica (group) — salon assigned",
  },
  {
    id: "turn-rosa-1",
    technicianId: "rosa",
    atMinutes: 720,
    kind: "Requested",
    value: 0.5,
    label: "Daniel requested Rosa",
  },
];
