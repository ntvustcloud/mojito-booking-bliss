import type { Appointment, TechnicianBlockout } from "@/data/manager-mock";
import { guestServiceValue } from "@/data/manager-mock";
import type { TechnicianCheckIn, TurnEvent } from "@/data/turn-system";

/**
 * V1 REGRESSION TEST DAY (development dataset).
 *
 * Deterministic salon day used to manually verify the ten core Manager Today
 * workflows. It only replaces the seed data — no business rule, geometry or
 * interaction lives here.
 *
 * Service prices and durations come from the shared salon menu
 * (`@/data/services` + `@/data/service-durations`) so the board never disagrees
 * with the customer site.
 *
 * Case map
 *  1  Jessica Alvarez   Walk-In 9:30 AM, unassigned      → Quick Assign
 *  2  Emily Carter      Appt 10:00 AM, Any Tech          → assign, keeps 10:00
 *  3  Sarah Nguyen      Appt 10:30 AM, requested Mai     → ½ turn + red heart
 *  4  Daniel Kim        Appt 1:00 PM on Tran             → drag Tran → Rosa
 *  5  Megan Lo          Appt 2:15 PM on Rosa             → drag → Waiting
 *  6  Jessica Park (Linh 10:30–11:20) + Priya Raman 11:15 → 5-min overlap
 *  7  Tran Break 12:30–1:00 PM and Personal block 5–6 PM
 *  8  Olivia Reed       Appt 3:45 PM on Tran             → cancel
 *  9  Kevin Moore       Walk-In 4:00 PM                  → assign, return 4:00
 * 10  Nina Patel        Appt 4:30 PM, Any Tech           → assign, return 4:30
 */

const MIN = (hour: number, minute = 0) => hour * 60 + minute;

export const testDayAppointments: Appointment[] = [
  // 1 — Walk-In waiting at its check-in time.
  {
    id: "t1",
    time: "9:30 AM",
    minutes: MIN(9, 30),
    title: "Jessica Alvarez",
    primaryContact: "Jessica Alvarez",
    phone: "(512) 555-0101",
    source: "Walk-In",
    notes: "Test 1 — Walk-In Quick Assign.",
    guests: [
      {
        id: "g1",
        name: "Jessica Alvarez",
        serviceIds: ["gel-manicure"],
        technicianId: "any",
        status: "Scheduled",
        arrivedAtMinutes: MIN(9, 30),
      },
    ],
  },
  // 2 — Any-Tech appointment waiting on its scheduled time.
  {
    id: "t2",
    time: "10:00 AM",
    minutes: MIN(10),
    title: "Emily Carter",
    primaryContact: "Emily Carter",
    phone: "(512) 555-0102",
    source: "Online",
    notes: "Test 2 — Any-Tech appointment must stay at 10:00 AM.",
    guests: [
      {
        id: "g2",
        name: "Emily Carter",
        serviceIds: ["acrylic-full-set"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
  // 3 — Requested technician (½ turn, red heart).
  {
    id: "t3",
    time: "10:30 AM",
    minutes: MIN(10, 30),
    title: "Sarah Nguyen",
    primaryContact: "Sarah Nguyen",
    phone: "(512) 555-0103",
    source: "Online",
    notes: "Test 3 — requested Mai, half turn.",
    guests: [
      {
        id: "g3",
        name: "Sarah Nguyen",
        serviceIds: ["signature-pedicure"],
        technicianId: "mai",
        requestedTechnicianId: "mai",
        status: "Scheduled",
        startMinutes: MIN(10, 30),
      },
    ],
  },
  // 6a — Linh already busy 10:30–11:20 so Priya only overlaps 5 minutes.
  {
    id: "t6a",
    time: "10:30 AM",
    minutes: MIN(10, 30),
    title: "Jessica Park",
    primaryContact: "Jessica Park",
    phone: "(512) 555-0106",
    source: "Online",
    notes: "Test 6 — overlap partner (ends 11:20 AM).",
    guests: [
      {
        id: "g6a",
        name: "Jessica Park",
        serviceIds: ["deluxe-pedicure"],
        technicianId: "linh",
        status: "Scheduled",
        startMinutes: MIN(10, 30),
      },
    ],
  },
  // 6b — Small-overlap candidate, must stay anchored at 11:15 AM.
  {
    id: "t6b",
    time: "11:15 AM",
    minutes: MIN(11, 15),
    title: "Priya Raman",
    primaryContact: "Priya Raman",
    phone: "(512) 555-0116",
    source: "Online",
    notes: "Test 6 — assign to Linh, 5-minute overlap must be allowed.",
    guests: [
      {
        id: "g6b",
        name: "Priya Raman",
        serviceIds: ["gel-x-full-set"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
  // 4 — Technician → technician reassignment.
  {
    id: "t4",
    time: "1:00 PM",
    minutes: MIN(13),
    title: "Daniel Kim",
    primaryContact: "Daniel Kim",
    phone: "(512) 555-0104",
    source: "Phone",
    notes: "Test 4 — drag from Tran to Rosa.",
    guests: [
      {
        id: "g4",
        name: "Daniel Kim",
        serviceIds: ["express-pedicure"],
        technicianId: "tran",
        status: "Scheduled",
        startMinutes: MIN(13),
      },
    ],
  },
  // 5 — Technician → Waiting / Unassigned.
  {
    id: "t5",
    time: "2:15 PM",
    minutes: MIN(14, 15),
    title: "Megan Lo",
    primaryContact: "Megan Lo",
    phone: "(512) 555-0105",
    source: "Online",
    notes: "Test 5 — drag from Rosa back to Waiting / Unassigned.",
    guests: [
      {
        id: "g5",
        name: "Megan Lo",
        serviceIds: ["gel-pedicure"],
        technicianId: "rosa",
        status: "Scheduled",
        startMinutes: MIN(14, 15),
      },
    ],
  },
  // 8 — Cancel.
  {
    id: "t8",
    time: "3:45 PM",
    minutes: MIN(15, 45),
    title: "Olivia Reed",
    primaryContact: "Olivia Reed",
    phone: "(512) 555-0108",
    source: "Online",
    notes: "Test 8 — cancel and check Tran's turn / service rollback.",
    guests: [
      {
        id: "g8",
        name: "Olivia Reed",
        serviceIds: ["acrylic-fill"],
        technicianId: "tran",
        status: "Scheduled",
        startMinutes: MIN(15, 45),
      },
    ],
  },
  // 9 — Walk-In restore to check-in time.
  {
    id: "t9",
    time: "4:00 PM",
    minutes: MIN(16),
    title: "Kevin Moore",
    primaryContact: "Kevin Moore",
    phone: "(512) 555-0109",
    source: "Walk-In",
    notes: "Test 9 — assign, then return to Waiting at 4:00 PM.",
    guests: [
      {
        id: "g9",
        name: "Kevin Moore",
        serviceIds: ["express-pedicure"],
        technicianId: "any",
        status: "Scheduled",
        arrivedAtMinutes: MIN(16),
      },
    ],
  },
  // 10 — Appointment restore to scheduled time.
  {
    id: "t10",
    time: "4:30 PM",
    minutes: MIN(16, 30),
    title: "Nina Patel",
    primaryContact: "Nina Patel",
    phone: "(512) 555-0110",
    source: "Online",
    notes: "Test 10 — assign, then return to Waiting at 4:30 PM.",
    guests: [
      {
        id: "g10",
        name: "Nina Patel",
        serviceIds: ["acrylic-fill"],
        technicianId: "any",
        status: "Scheduled",
      },
    ],
  },
];

/** 7 — Block Time / Break fixtures (Tran). */
export const testDayBlockouts: TechnicianBlockout[] = [
  {
    id: "t7-break",
    technicianId: "tran",
    kind: "Break",
    label: "Break",
    start: MIN(12, 30),
    end: MIN(13),
  },
  {
    id: "t7-personal",
    technicianId: "tran",
    kind: "Personal",
    label: "Personal",
    start: MIN(17),
    end: MIN(18),
    note: "Test 7 — edit, resize, then delete.",
  },
];

/** Check-in order fixes the starting turn priority: Mai, Linh, Tran, Rosa. */
export const testDayCheckIns: TechnicianCheckIn[] = [
  { technicianId: "mai", atMinutes: MIN(8, 40) },
  { technicianId: "linh", atMinutes: MIN(8, 45) },
  { technicianId: "tran", atMinutes: MIN(8, 50) },
  { technicianId: "rosa", atMinutes: MIN(8, 55) },
];

/**
 * Ledger seed. Every technician starts at 0 turns / $0 service; the only
 * events are the zero-value check-ins plus the credit implied by the cards that
 * are pre-placed for tests 3, 4, 5, 6 and 8 (without them a rollback test would
 * have nothing to roll back).
 */
function seedAssignment(
  appointmentId: string,
  guestId: string,
): TurnEvent {
  const appointment = testDayAppointments.find((item) => item.id === appointmentId)!;
  const guest = appointment.guests.find((item) => item.id === guestId)!;
  const requested = guest.requestedTechnicianId === guest.technicianId;
  return {
    id: `turn-${guest.technicianId}-${appointmentId}-${guestId}`,
    technicianId: guest.technicianId,
    atMinutes: guest.startMinutes ?? appointment.minutes,
    kind: requested ? "Requested" : "Salon Assigned",
    value: requested ? 0.5 : 1,
    serviceValue: guestServiceValue(guest),
    guestKey: `${appointmentId}:${guestId}`,
    guestName: guest.name,
    label: requested
      ? `${guest.name} — requested technician`
      : `${guest.name} — salon assigned`,
  };
}

export const testDayTurnEvents: TurnEvent[] = [
  ...testDayCheckIns.map((checkIn) => ({
    id: `chk-${checkIn.technicianId}`,
    technicianId: checkIn.technicianId,
    atMinutes: checkIn.atMinutes,
    kind: "Check In" as const,
    value: 0,
    serviceValue: 0,
    label: "Checked in",
  })),
  seedAssignment("t3", "g3"),
  seedAssignment("t6a", "g6a"),
  seedAssignment("t4", "g4"),
  seedAssignment("t5", "g5"),
  seedAssignment("t8", "g8"),
];

/** Manual regression checklist (development only). */
export const TEST_CHECKLIST: { id: string; label: string }[] = [
  { id: "1", label: "Walk-In Quick Assign (Jessica Alvarez 9:30 AM)" },
  { id: "2", label: "Any-Tech appointment assign (Emily Carter 10:00 AM)" },
  { id: "3", label: "Requested tech = ½ turn (Sarah Nguyen · Mai)" },
  { id: "4", label: "Tech → Tech reassign (Daniel Kim · Tran → Rosa)" },
  { id: "5", label: "Tech → Unassigned (Megan Lo 2:15 PM)" },
  { id: "6", label: "Under 15-min overlap (Priya Raman → Linh)" },
  { id: "7", label: "Block / Break edit, resize, delete (Tran)" },
  { id: "8", label: "Cancel (Olivia Reed 3:45 PM)" },
  { id: "9", label: "Walk-In restores 4:00 PM (Kevin Moore)" },
  { id: "10", label: "Appointment restores 4:30 PM (Nina Patel)" },
];
