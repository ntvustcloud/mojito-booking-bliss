import { useEffect, useState } from "react";
import type { Appointment } from "@/data/manager-mock";

/**
 * Shared arrival log between the tablet kiosk (`/check-in`) and the Manager
 * Today board. Prototype persistence only: one localStorage key plus a browser
 * event so both screens stay in sync inside the same device/session.
 *
 * The kiosk never invents its own dataset — appointment check-ins reference the
 * existing booking, and walk-in check-ins become real Waiting / Unassigned
 * bookings through `walkInAppointments()`.
 */

export type CheckInKind = "Appointment" | "Walk-In";

export type CheckInRecord = {
  id: string;
  kind: CheckInKind;
  name: string;
  phone: string;
  /** Minutes from midnight when the customer tapped Check In. */
  atMinutes: number;
  /** Appointment check-in: the booking + guest that arrived. */
  appointmentId?: string;
  guestId?: string;
  /** Walk-in check-in: the services they asked for. */
  serviceIds?: string[];
};

const STORAGE_KEY = "mojito.checkins.v1";
const EVENT = "mojito:checkins";

function isRecord(value: unknown): value is CheckInRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CheckInRecord>;
  return typeof record.id === "string" && typeof record.name === "string";
}

export function readCheckIns(): CheckInRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function write(records: CheckInRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* private-mode tablets simply lose persistence */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addCheckIn(record: Omit<CheckInRecord, "id">): CheckInRecord {
  const created: CheckInRecord = {
    ...record,
    id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  write([...readCheckIns(), created]);
  return created;
}

export function clearCheckIns() {
  write([]);
}

/** Live view of the arrival log (empty during SSR, hydrates on the client). */
export function useCheckIns(): CheckInRecord[] {
  const [records, setRecords] = useState<CheckInRecord[]>([]);

  useEffect(() => {
    const sync = () => setRecords(readCheckIns());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return records;
}

/** Walk-in arrivals as real bookings anchored to their check-in time. */
export function walkInAppointments(records: CheckInRecord[]): Appointment[] {
  return records
    .filter((record) => record.kind === "Walk-In")
    .map((record) => ({
      id: `apt-${record.id}`,
      time: formatClock(record.atMinutes),
      minutes: record.atMinutes,
      title: record.name,
      primaryContact: record.name,
      phone: record.phone,
      source: "Walk-In" as const,
      notes: "Self check-in at the front tablet.",
      guests: [
        {
          id: `${record.id}-g`,
          name: record.name,
          serviceIds: record.serviceIds ?? [],
          technicianId: "any",
          status: "Scheduled" as const,
        },
      ],
    }));
}

/** appointmentId → arrival time, for booked customers who checked themselves in. */
export function arrivalTimes(records: CheckInRecord[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const record of records) {
    if (record.kind === "Appointment" && record.appointmentId) {
      map[record.appointmentId] = record.atMinutes;
    }
  }
  return map;
}

function formatClock(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}
