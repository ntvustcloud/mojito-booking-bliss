/**
 * Booking rules the salon owner may want to tune later.
 * Kept in one place so limits are easy to change.
 */
export const MAX_PARTY_SIZE = 4;

/** How far ahead guests may book online (in months). */
export const BOOKING_WINDOW_MONTHS = 4;

/** How many quick-pick days to show above the calendar. */
export const QUICK_DAYS = 14;

export type GroupSchedulingPreference = "together" | "flexible";

export const SCHEDULING_PREFERENCES: {
  id: GroupSchedulingPreference;
  label: string;
  description: string;
}[] = [
  {
    id: "together",
    label: "Start together if possible",
    description:
      "We'll try to find technicians who can begin everyone's services around the same time.",
  },
  {
    id: "flexible",
    label: "Same visit, flexible start times",
    description: "Allow small differences in start times if that opens up more availability.",
  },
];

/**
 * Prototype availability: a simple available / unavailable state per date.
 * Past dates are never available. Replace with real salon availability later.
 */
export function isDateAvailable(date: Date, partySize = 1): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() < today.getTime()) return false;
  const max = new Date(today);
  max.setMonth(max.getMonth() + BOOKING_WINDOW_MONTHS);
  if (day.getTime() > max.getTime()) return false;
  // Deterministic placeholder: larger parties have fewer open days.
  const seed = day.getDate() + day.getMonth() * 3;
  if (partySize > 2 && seed % 5 === 0) return false;
  return seed % 7 !== 3;
}
