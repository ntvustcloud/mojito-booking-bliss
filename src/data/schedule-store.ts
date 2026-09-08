import { useSyncExternalStore } from "react";
import type { Appointment, BookingGuest, TechnicianBlockout } from "@/data/manager-mock";
import type { TurnEvent } from "@/data/turn-system";
import {
  testDayAppointments,
  testDayBlockouts,
  testDayTurnEvents,
} from "@/data/regression-day";
import { seedFutureAppointments, seedFutureBlockouts } from "@/data/calendar";

/**
 * ONE shared scheduling state for the whole manager portal.
 *
 * `/manager/today`, `/manager/calendar` and the `/check-in` kiosk all read and
 * write the SAME bookings and block time. There is deliberately no separate
 * "calendar dataset": a booking created on Friday in the Calendar is the exact
 * record that shows up on the Today board when Friday arrives.
 *
 * Prototype persistence only — module state plus subscribers, no backend yet.
 */

export type ScheduleState = {
  appointments: Appointment[];
  blockouts: TechnicianBlockout[];
  turnEvents: TurnEvent[];
};

function seed(): ScheduleState {
  return {
    appointments: [...testDayAppointments, ...seedFutureAppointments()],
    blockouts: [...testDayBlockouts, ...seedFutureBlockouts()],
    turnEvents: [...testDayTurnEvents],
  };
}

let state: ScheduleState = seed();
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const snapshot = () => state;

/** Live shared schedule. Identical on server and client (deterministic seed). */
export function useScheduleState(): ScheduleState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const getSchedule = () => state;

type Updater<T> = T | ((current: T) => T);

const resolve = <T,>(value: Updater<T>, current: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(current) : value;

export function setAppointments(value: Updater<Appointment[]>) {
  const next = resolve(value, state.appointments);
  if (next === state.appointments) return;
  state = { ...state, appointments: next };
  emit();
}

export function setBlockouts(value: Updater<TechnicianBlockout[]>) {
  const next = resolve(value, state.blockouts);
  if (next === state.blockouts) return;
  state = { ...state, blockouts: next };
  emit();
}

export function setTurnEvents(value: Updater<TurnEvent[]>) {
  const next = resolve(value, state.turnEvents);
  if (next === state.turnEvents) return;
  state = { ...state, turnEvents: next };
  emit();
}

/** Restore the seeded prototype day (used by the V1 test-day reset). */
export function resetSchedule() {
  state = seed();
  emit();
}

/** `startMinutes: undefined` clears a placement (card returns to its anchor). */
export type GuestPatch = Omit<Partial<BookingGuest>, "startMinutes"> & {
  startMinutes?: number | undefined;
};

export function updateGuest(appointmentId: string, guestId: string, patch: GuestPatch) {
  setAppointments((current) =>
    current.map((appointment) =>
      appointment.id !== appointmentId
        ? appointment
        : {
            ...appointment,
            guests: appointment.guests.map((guest) => {
              if (guest.id !== guestId) return guest;
              const next: BookingGuest = { ...guest, ...patch } as BookingGuest;
              if ("startMinutes" in patch && patch.startMinutes === undefined) {
                delete next.startMinutes;
              }
              return next;
            }),
          },
    ),
  );
}

/** Drop every fairness event tied to one guest (cancel / restore flows). */
export function clearGuestEvents(appointmentId: string, guestId: string) {
  setTurnEvents((current) =>
    current.filter((event) => event.guestKey !== `${appointmentId}:${guestId}`),
  );
}
