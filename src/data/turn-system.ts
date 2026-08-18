import {
  DAY_START_MINUTES,
  blocksForTechnician,
  findBlockout,
  findConflict,
  formatShortMinutes,
  nextBlockStart,
  nextFreeMinute,
  type ScheduleBlock,
} from "@/data/schedule";
import type { TechnicianBlockout, TechnicianRow } from "@/data/manager-mock";


/**
 * Nail-salon Turn Recommendation System.
 *
 * Pure decision support: it ranks technicians for a specific customer and
 * never assigns anybody. The manager still drags the card.
 *
 * Fairness model
 *  - Day order starts from each technician's check-in time.
 *  - Salon-assigned customer (walk-in, or an "Any available" booking the
 *    manager placed) = +1.0 turn.
 *  - Customer who specifically requested that technician = +0.5 turn.
 *  - Technicians who are busy / on break / short on time keep their priority;
 *    they are only skipped for the customer in front of the manager.
 */

export type TurnEventKind = "Check In" | "Walk-In" | "Salon Assigned" | "Requested";

/**
 * One fairness event. Turn value AND service value are both attached to the
 * assignment that produced them, so reassign / cancel / undo just drop the
 * event — totals can never drift or double-count.
 */
export type TurnEvent = {
  id: string;
  technicianId: string;
  /** Minutes from midnight. */
  atMinutes: number;
  kind: TurnEventKind;
  /** Turn value added by this event (0 for check-in). */
  value: number;
  /** Service revenue assigned by this event, in dollars (0 for check-in). */
  serviceValue: number;
  /** `appointmentId:guestId` of the assignment this event belongs to. */
  guestKey?: string;
  guestName?: string;
  serviceLabel?: string;
  /** Short human line for the turn history list. */
  label: string;
};

export const TURN_VALUES = {
  walkIn: 1,
  salonAssigned: 1,
  requested: 0.5,
} as const;

/** Mock check-in clock — replace with a real employee check-in feed later. */
export type TechnicianCheckIn = { technicianId: string; atMinutes: number };

export function turnTotals(events: TurnEvent[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const event of events) {
    totals[event.technicianId] = (totals[event.technicianId] ?? 0) + event.value;
  }
  return totals;
}

/** "Service Total Today" per technician — service prices only, never income. */
export function serviceTotals(events: TurnEvent[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const event of events) {
    totals[event.technicianId] =
      (totals[event.technicianId] ?? 0) + (event.serviceValue || 0);
  }
  return totals;
}

/**
 * Turn buckets group "reasonably similar" turn priority. Inside one bucket the
 * Service Total becomes the tie-breaker; across buckets turn fairness wins.
 */
export function turnBucket(total: number): number {
  return Math.floor(total + 1e-9);
}

export function checkInMinute(checkIns: TechnicianCheckIn[], technicianId: string): number | null {
  return checkIns.find((item) => item.technicianId === technicianId)?.atMinutes ?? null;
}

export function turnHistory(events: TurnEvent[], technicianId: string): TurnEvent[] {
  return events
    .filter((event) => event.technicianId === technicianId)
    .sort((a, b) => a.atMinutes - b.atMinutes);
}


/**
 * Fairness order for the whole day: lowest turn total first, then the earliest
 * check-in. Technicians who have not checked in join the back of the rotation.
 */
export function turnOrder(
  technicians: TechnicianRow[],
  checkIns: TechnicianCheckIn[],
  totals: Record<string, number>,
  revenues: Record<string, number> = {},
): string[] {
  return [...technicians]
    .sort((a, b) => {
      const totalA = totals[a.id] ?? 0;
      const totalB = totals[b.id] ?? 0;
      if (turnBucket(totalA) !== turnBucket(totalB)) return totalA - totalB;
      // Same turn bucket → the lighter Service Total goes first.
      const moneyA = revenues[a.id] ?? 0;
      const moneyB = revenues[b.id] ?? 0;
      if (moneyA !== moneyB) return moneyA - moneyB;
      if (totalA !== totalB) return totalA - totalB;
      const checkA = checkInMinute(checkIns, a.id);
      const checkB = checkInMinute(checkIns, b.id);
      if (checkA === null && checkB === null) return a.name.localeCompare(b.name);
      if (checkA === null) return 1;
      if (checkB === null) return -1;
      return checkA - checkB;
    })
    .map((technician) => technician.id);
}


export function turnPositions(order: string[]): Record<string, number> {
  const positions: Record<string, number> = {};
  order.forEach((id, index) => {
    positions[id] = index + 1;
  });
  return positions;
}

/**
 * Placeholder skill check — every Mojito technician is trained on the full
 * menu today. Swap for real service/skill mapping when staff skills exist.
 */
export function canPerformServices(_technicianId: string, _serviceLabel: string): boolean {
  return true;
}

export type TurnQuality = "best" | "eligible" | "limited" | "ineligible";

export type TurnCandidate = {
  technicianId: string;
  name: string;
  initials: string;
  /** Fairness position (#1 = next due a turn), preserved even when skipped. */
  position: number;
  total: number;
  /** Service Total Today in dollars (service prices only). */
  serviceTotal: number;
  quality: TurnQuality;
  recommended: boolean;
  /** e.g. "Available now", "In Service", "Break". */
  state: string;
  /** e.g. "Free until 1 PM", "Not enough time for this 50-minute service". */
  detail: string;
  /** Start of the technician's next booking after this placement, if any. */
  nextBooking?: number;
  /** Plain-language "why this one" line for the recommendation explanation. */
  reason?: string;
  /** True when the technician is skipped for this customer only. */
  priorityPreserved: boolean;
};


/** Last moment this technician finished an appointment before `now`. */
function lastFinishedBefore(blocks: ScheduleBlock[], technicianId: string, now: number): number {
  let last = DAY_START_MINUTES;
  for (const block of blocksForTechnician(blocks, technicianId)) {
    const end = block.start + block.duration;
    if (end <= now && end > last) last = end;
  }
  return last;
}

export type TurnInput = {
  technicians: TechnicianRow[];
  blocks: ScheduleBlock[];
  blockouts: TechnicianBlockout[];
  checkIns: TechnicianCheckIn[];
  events: TurnEvent[];
  /** Minutes from midnight the customer would start. */
  start: number;
  duration: number;
  serviceLabel: string;
  /** Block being placed, excluded from conflict checks. */
  ignoreKey?: string;
  requestedTechnicianId?: string | undefined;
  now: number | null;
};

/**
 * Rank technicians for one customer: eligibility first, then turn fairness.
 */
export function evaluateCandidates(input: TurnInput): TurnCandidate[] {
  const { technicians, blocks, blockouts, checkIns, events, start, duration, serviceLabel } = input;
  const totals = turnTotals(events);
  const revenues = serviceTotals(events);
  const positions = turnPositions(turnOrder(technicians, checkIns, totals, revenues));
  const now = input.now ?? start;
  const ignoreKey = input.ignoreKey ?? "";

  const candidates: TurnCandidate[] = technicians.map((technician) => {
    const total = totals[technician.id] ?? 0;
    const position = positions[technician.id] ?? technicians.length;
    const base = {
      technicianId: technician.id,
      name: technician.name,
      initials: technician.initials,
      position,
      total,
      serviceTotal: revenues[technician.id] ?? 0,
      recommended: false,
      state: technician.state === "Available" ? "Available now" : technician.state,
    };


    if (checkInMinute(checkIns, technician.id) === null) {
      return {
        ...base,
        quality: "ineligible" as const,
        detail: "Not checked in today",
        priorityPreserved: false,
      };
    }
    if (technician.state === "Off") {
      return {
        ...base,
        quality: "ineligible" as const,
        detail: "Off today",
        priorityPreserved: false,
      };
    }
    if (!canPerformServices(technician.id, serviceLabel)) {
      return {
        ...base,
        quality: "ineligible" as const,
        detail: "Cannot perform this service",
        priorityPreserved: true,
      };
    }

    const techBlockouts = blockouts.filter((item) => item.technicianId === technician.id);

    if (technician.state === "Break") {
      const current = techBlockouts.find(
        (item) => now >= item.start && now < item.end,
      );
      const back = current?.end ?? techBlockouts.find((item) => item.start >= now)?.end;
      return {
        ...base,
        quality: "ineligible" as const,
        detail: back
          ? `Back at ${formatShortMinutes(back)} · priority preserved`
          : "On break · priority preserved",
        priorityPreserved: true,
      };
    }

    const blocked = findBlockout(techBlockouts, technician.id, start, duration);
    if (blocked) {
      return {
        ...base,
        quality: "ineligible" as const,
        detail: `${blocked.label} until ${formatShortMinutes(blocked.end)} · priority preserved`,
        priorityPreserved: true,
      };
    }

    const conflict = findConflict(blocks, technician.id, start, duration, ignoreKey);
    if (conflict) {
      const free = nextFreeMinute(blocks, technician.id, Math.max(now, start));
      const busyNow = conflict.start <= now && conflict.start + conflict.duration > now;
      return {
        ...base,
        quality: "ineligible" as const,
        detail: busyNow
          ? `Free at ${formatShortMinutes(free)} · priority preserved`
          : `${conflict.guestName} at ${formatShortMinutes(conflict.start)} · not enough time for this ${duration}-minute service`,
        priorityPreserved: true,
      };
    }

    const next = nextBlockStart(blocks, technician.id, start);
    const nextBreak = techBlockouts.find((item) => item.start >= start);
    const wall = Math.min(next ?? Infinity, nextBreak?.start ?? Infinity);
    const gap = wall === Infinity ? Infinity : wall - start;

    if (gap < duration) {
      return {
        ...base,
        quality: "ineligible" as const,
        detail: `Upcoming at ${formatShortMinutes(wall)} · not enough time for this ${duration}-minute service`,
        priorityPreserved: true,
      };
    }

    const detail =
      wall === Infinity
        ? "No upcoming appointment"
        : `Free until ${formatShortMinutes(wall)}`;

    return {
      ...base,
      quality: gap - duration < 30 ? ("limited" as const) : ("eligible" as const),
      detail: gap - duration < 30 ? `${detail} · tight fit` : detail,
      ...(wall === Infinity ? {} : { nextBooking: wall }),
      priorityPreserved: false,
    };
  });

  const eligible = candidates
    .filter((candidate) => candidate.quality !== "ineligible")
    .sort((a, b) => {
      // 1. Turn fairness is primary…
      if (turnBucket(a.total) !== turnBucket(b.total)) return a.total - b.total;
      // 2. …Service Total balances technicians on the same turn level…
      if (a.serviceTotal !== b.serviceTotal) return a.serviceTotal - b.serviceTotal;
      if (a.total !== b.total) return a.total - b.total;
      const checkA = checkInMinute(checkIns, a.technicianId) ?? Infinity;
      const checkB = checkInMinute(checkIns, b.technicianId) ?? Infinity;
      if (checkA !== checkB) return checkA - checkB;
      // 3. Final tie-breaker: whoever has been idle longest.
      return (
        lastFinishedBefore(blocks, a.technicianId, now) -
        lastFinishedBefore(blocks, b.technicianId, now)
      );
    });

  // A specifically requested technician wins whenever they are eligible.
  const requested = input.requestedTechnicianId
    ? eligible.find((candidate) => candidate.technicianId === input.requestedTechnicianId)
    : undefined;
  // Otherwise prefer a fully-eligible technician over a tight fit.
  const best =
    requested ?? eligible.find((candidate) => candidate.quality === "eligible") ?? eligible[0];
  if (best) {
    best.recommended = true;
    best.quality = "best";
    const runnerUp = eligible.find((candidate) => candidate !== best);
    best.reason = requested
      ? "Customer requested this technician"
      : runnerUp && turnBucket(runnerUp.total) === turnBucket(best.total) &&
          runnerUp.serviceTotal > best.serviceTotal
        ? `Same turn count as ${runnerUp.name}, lower service total today`
        : `Fewest turns today (${best.total.toFixed(1)}) and open time now`;
  }

  const skipped = candidates
    .filter((candidate) => candidate.quality === "ineligible")
    .sort((a, b) => a.position - b.position);

  return [...eligible, ...skipped];
}


/** Turn value the technician earns for accepting this customer. */
export function turnValueFor(
  technicianId: string,
  requestedTechnicianId: string | undefined,
  source: "Walk-In" | "Online" | "Phone",
): { value: number; kind: TurnEventKind } {
  if (requestedTechnicianId && requestedTechnicianId === technicianId) {
    return { value: TURN_VALUES.requested, kind: "Requested" };
  }
  if (source === "Walk-In") return { value: TURN_VALUES.walkIn, kind: "Walk-In" };
  return { value: TURN_VALUES.salonAssigned, kind: "Salon Assigned" };
}
