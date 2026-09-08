import {
  workingTechnicians,
  type Appointment,
  type TechnicianBlockout,
} from "@/data/manager-mock";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  buildBlocks,
  guestDuration,
  isActiveBlock,
} from "@/data/schedule";

/**
 * Calendar primitives shared by Manager Today and Manager Calendar.
 *
 * Nothing here duplicates scheduling logic — the grid geometry, overlap rules
 * and card model still live in `@/data/schedule`. This module only adds the
 * DATE dimension (which day a booking or block belongs to), technician weekly
 * working hours, and light capacity summaries for Week / Month planning.
 */

export type DateKey = string; // "YYYY-MM-DD" in salon-local time

const pad = (value: number) => String(value).padStart(2, "0");

export function dateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1);
}

/** Today's key, resolved once per session. */
export const TODAY_KEY: DateKey = dateKey(new Date());

export const isTodayKey = (key: DateKey) => key === TODAY_KEY;

export function addDaysKey(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function addMonthsKey(key: DateKey, months: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return dateKey(date);
}

/** 0 = Monday … 6 = Sunday (front-desk weeks start on Monday). */
export function weekdayIndex(key: DateKey): number {
  return (parseDateKey(key).getDay() + 6) % 7;
}

export function startOfWeekKey(key: DateKey): DateKey {
  return addDaysKey(key, -weekdayIndex(key));
}

export function weekKeys(key: DateKey): DateKey[] {
  const start = startOfWeekKey(key);
  return Array.from({ length: 7 }, (_, index) => addDaysKey(start, index));
}

/** Six-week Monday-first grid covering the month of `key`. */
export function monthGridKeys(key: DateKey): DateKey[] {
  const date = parseDateKey(key);
  date.setDate(1);
  const first = startOfWeekKey(dateKey(date));
  return Array.from({ length: 42 }, (_, index) => addDaysKey(first, index));
}

export function isSameMonth(key: DateKey, other: DateKey): boolean {
  return key.slice(0, 7) === other.slice(0, 7);
}

export function formatDateKey(
  key: DateKey,
  options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" },
): string {
  return parseDateKey(key).toLocaleDateString("en-US", options);
}

export const formatDayShort = (key: DateKey) =>
  formatDateKey(key, { weekday: "short", month: "short", day: "numeric" });

export const formatMonthLabel = (key: DateKey) =>
  formatDateKey(key, { month: "long", year: "numeric" });

/* ---------------- Technician working hours ---------------- */

export type WorkingHours = { start: number; end: number } | null;

const H = (hour: number, minute = 0) => hour * 60 + minute;

/** Weekly shift pattern, Monday → Sunday. `null` = not working that day. */
const WEEKLY_HOURS: Record<string, WorkingHours[]> = {
  mai: [
    { start: H(9, 30), end: H(19) },
    { start: H(9, 30), end: H(19) },
    { start: H(9, 30), end: H(19) },
    { start: H(9, 30), end: H(19) },
    { start: H(9, 30), end: H(19) },
    { start: H(9), end: H(18) },
    null,
  ],
  linh: [
    { start: H(9, 30), end: H(19) },
    { start: H(9, 30), end: H(19) },
    null,
    { start: H(9, 30), end: H(19) },
    { start: H(9, 30), end: H(19) },
    { start: H(9), end: H(18) },
    { start: H(11), end: H(17) },
  ],
  tran: [
    null,
    { start: H(10), end: H(19) },
    { start: H(10), end: H(19) },
    { start: H(10), end: H(19) },
    { start: H(10), end: H(19) },
    { start: H(9), end: H(18) },
    { start: H(11), end: H(17) },
  ],
  rosa: [
    { start: H(9), end: H(17) },
    { start: H(9), end: H(17) },
    { start: H(9), end: H(17) },
    null,
    { start: H(9), end: H(17) },
    { start: H(9), end: H(18) },
    null,
  ],
};

export function workingHoursFor(technicianId: string, key: DateKey): WorkingHours {
  const week = WEEKLY_HOURS[technicianId];
  if (!week) return { start: DAY_START_MINUTES, end: DAY_END_MINUTES };
  return week[weekdayIndex(key)] ?? null;
}

export const worksOn = (technicianId: string, key: DateKey) =>
  workingHoursFor(technicianId, key) !== null;

export function techniciansWorkingOn(key: DateKey): string[] {
  return workingTechnicians.filter((technician) => worksOn(technician.id, key)).map((t) => t.id);
}

/**
 * Off-shift stretches expressed as ordinary block time, so availability stays
 * strictly TIME-RANGE based: an evening off-shift block never makes a
 * technician look unavailable in the morning.
 */
export function offShiftBlockouts(key: DateKey): TechnicianBlockout[] {
  const list: TechnicianBlockout[] = [];
  for (const technician of workingTechnicians) {
    const hours = workingHoursFor(technician.id, key);
    if (!hours) {
      list.push({
        id: `off-${technician.id}-${key}`,
        technicianId: technician.id,
        kind: "Unavailable",
        label: "Off today",
        start: DAY_START_MINUTES,
        end: DAY_END_MINUTES,
        date: key,
      });
      continue;
    }
    if (hours.start > DAY_START_MINUTES) {
      list.push({
        id: `off-${technician.id}-${key}-am`,
        technicianId: technician.id,
        kind: "Unavailable",
        label: "Before shift",
        start: DAY_START_MINUTES,
        end: hours.start,
        date: key,
      });
    }
    if (hours.end < DAY_END_MINUTES) {
      list.push({
        id: `off-${technician.id}-${key}-pm`,
        technicianId: technician.id,
        kind: "Unavailable",
        label: "After shift",
        start: hours.end,
        end: DAY_END_MINUTES,
        date: key,
      });
    }
  }
  return list;
}

/* ---------------- Capacity summaries (Week / Month) ---------------- */

export type TechnicianDayLoad = {
  id: string;
  name: string;
  initials: string;
  off: boolean;
  bookings: number;
  bookedMinutes: number;
  shiftMinutes: number;
  /** First long opening after noon, when there is one. */
  afternoonOpen: boolean;
  blockLabels: string[];
};

export type DayLoad = {
  key: DateKey;
  bookings: number;
  unassigned: number;
  closed: boolean;
  workingTechs: number;
  /** 0–1 share of the day's technician hours already booked. */
  load: number;
  technicians: TechnicianDayLoad[];
};

export function dayLoad(
  key: DateKey,
  appointments: Appointment[],
  blockouts: TechnicianBlockout[],
): DayLoad {
  const dayAppointments = appointments.filter((appointment) => appointmentDate(appointment) === key);
  const blocks = buildBlocks(dayAppointments).filter(isActiveBlock);
  const dayBlockouts = blockouts.filter((blockout) => blockoutDate(blockout) === key);

  const technicians: TechnicianDayLoad[] = workingTechnicians.map((technician) => {
    const hours = workingHoursFor(technician.id, key);
    const mine = blocks.filter((block) => block.technicianId === technician.id);
    const bookedMinutes = mine.reduce((sum, block) => sum + block.duration, 0);
    const afternoon = hours
      ? mine.filter((block) => block.start + block.duration > Math.max(hours.start, 12 * 60))
      : [];
    const afternoonMinutes = afternoon.reduce((sum, block) => sum + block.duration, 0);
    const afternoonShift = hours ? Math.max(0, hours.end - Math.max(hours.start, 12 * 60)) : 0;
    return {
      id: technician.id,
      name: technician.name,
      initials: technician.initials,
      off: hours === null,
      bookings: mine.length,
      bookedMinutes,
      shiftMinutes: hours ? hours.end - hours.start : 0,
      afternoonOpen: afternoonShift > 0 && afternoonShift - afternoonMinutes >= 90,
      blockLabels: dayBlockouts
        .filter((blockout) => blockout.technicianId === technician.id)
        .map((blockout) => blockout.label),
    };
  });

  const shiftTotal = technicians.reduce((sum, technician) => sum + technician.shiftMinutes, 0);
  const bookedTotal = technicians.reduce((sum, technician) => sum + technician.bookedMinutes, 0);
  const working = technicians.filter((technician) => !technician.off).length;

  return {
    key,
    bookings: blocks.length,
    unassigned: blocks.filter((block) => block.technicianId === "any").length,
    closed: working === 0,
    workingTechs: working,
    load: shiftTotal > 0 ? Math.min(1, bookedTotal / shiftTotal) : 0,
    technicians,
  };
}

/* ---------------- Date helpers on the booking model ---------------- */

/** A booking without an explicit date belongs to today (prototype seed data). */
export const appointmentDate = (appointment: Appointment): DateKey =>
  appointment.date ?? TODAY_KEY;

export const blockoutDate = (blockout: TechnicianBlockout): DateKey => blockout.date ?? TODAY_KEY;

export const appointmentsOn = (appointments: Appointment[], key: DateKey) =>
  appointments.filter((appointment) => appointmentDate(appointment) === key);

export const blockoutsOn = (blockouts: TechnicianBlockout[], key: DateKey) =>
  blockouts.filter((blockout) => blockoutDate(blockout) === key);

/* ---------------- Deterministic future planning data ---------------- */

/** Small deterministic PRNG so the seeded calendar looks the same every load. */
function rng(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  "Ava Chen",
  "Sofia Martinez",
  "Hannah Brooks",
  "Priya Raman",
  "Grace Liu",
  "Chloe Bennett",
  "Maya Okafor",
  "Isabel Ortiz",
  "Leah Fischer",
  "Nora Ahmed",
  "Ruby Tanaka",
  "Elena Petrova",
  "Jasmine Wu",
  "Camila Rojas",
  "Tessa Meyer",
  "Amara Blake",
];

const SERVICE_SETS = [
  ["gel-manicure"],
  ["signature-pedicure"],
  ["acrylic-full-set"],
  ["gel-x-full-set"],
  ["dip-powder"],
  ["gel-pedicure"],
  ["classic-manicure", "express-pedicure"],
  ["spa-manicure", "paraffin-add-on"],
  ["acrylic-fill"],
  ["deluxe-pedicure"],
  ["gel-manicure", "nail-art-simple"],
];

const phoneFor = (random: () => number) =>
  `(512) 555-${String(Math.floor(random() * 9000) + 1000)}`;

/** Planning-grade bookings for one future day. */
function bookingsForDay(key: DateKey): Appointment[] {
  const random = rng(key);
  const weekday = weekdayIndex(key);
  const busy = weekday === 4 || weekday === 5 ? 1.35 : weekday === 6 ? 0.7 : 1;
  const result: Appointment[] = [];
  let counter = 0;

  for (const technician of workingTechnicians) {
    const hours = workingHoursFor(technician.id, key);
    if (!hours) continue;
    let cursor = hours.start + Math.round(random() * 4) * 15;
    const target = Math.round((3 + random() * 3) * busy);
    for (let index = 0; index < target; index += 1) {
      const services = SERVICE_SETS[Math.floor(random() * SERVICE_SETS.length)]!;
      const guest = {
        id: `g${counter}`,
        name: NAMES[Math.floor(random() * NAMES.length)]!,
        serviceIds: services,
        technicianId: technician.id,
        status: "Scheduled" as const,
        startMinutes: cursor,
        ...(random() < 0.45 ? { requestedTechnicianId: technician.id } : {}),
      };
      const duration = guestDuration(guest);
      if (cursor + duration > hours.end) break;
      counter += 1;
      result.push({
        id: `f-${key}-${technician.id}-${index}`,
        time: "",
        minutes: cursor,
        title: guest.name,
        primaryContact: guest.name,
        phone: phoneFor(random),
        source: random() < 0.6 ? "Online" : "Phone",
        date: key,
        guests: [guest],
      });
      cursor += duration + Math.round(random() * 3) * 15;
      if (cursor >= hours.end) break;
    }
  }

  // A couple of "Any Available" bookings that still need a chair.
  const anyCount = random() < 0.6 ? 2 : 1;
  for (let index = 0; index < anyCount; index += 1) {
    const name = NAMES[Math.floor(random() * NAMES.length)]!;
    const minutes = 10 * 60 + Math.floor(random() * 24) * 15;
    result.push({
      id: `f-${key}-any-${index}`,
      time: "",
      minutes,
      title: name,
      primaryContact: name,
      phone: phoneFor(random),
      source: "Online",
      date: key,
      guests: [
        {
          id: `ga${index}`,
          name,
          serviceIds: SERVICE_SETS[Math.floor(random() * SERVICE_SETS.length)]!,
          technicianId: "any",
          status: "Scheduled",
        },
      ],
    });
  }

  return result;
}

/** Seeded future book of business: tomorrow through ~10 weeks out. */
export function seedFutureAppointments(days = 70): Appointment[] {
  const list: Appointment[] = [];
  for (let offset = 1; offset <= days; offset += 1) {
    list.push(...bookingsForDay(addDaysKey(TODAY_KEY, offset)));
  }
  return list;
}

/** A few planned breaks / personal blocks on future days. */
export function seedFutureBlockouts(days = 70): TechnicianBlockout[] {
  const list: TechnicianBlockout[] = [];
  for (let offset = 1; offset <= days; offset += 1) {
    const key = addDaysKey(TODAY_KEY, offset);
    for (const technician of workingTechnicians) {
      const hours = workingHoursFor(technician.id, key);
      if (!hours) continue;
      const random = rng(`${key}-${technician.id}-lunch`);
      const start = 12 * 60 + Math.floor(random() * 8) * 15;
      if (start + 30 > hours.end) continue;
      list.push({
        id: `bo-${technician.id}-${key}`,
        technicianId: technician.id,
        kind: "Lunch",
        label: "Lunch",
        start,
        end: start + 30,
        date: key,
      });
    }
  }
  return list;
}
