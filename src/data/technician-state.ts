import {
  isBreakKind,
  workingTechnicians,
  type Appointment,
  type TechnicianBlockout,
  type TechnicianRow,
  type TechnicianState,
} from "@/data/manager-mock";
import { buildBlocks, isActiveBlock, blocksForTechnician } from "@/data/schedule";

/**
 * Technician availability is INFERRED, never manually toggled.
 *
 * Single source of truth = appointment cards + block time cards + the clock.
 * If a booking covers "now" the technician is busy; if a block time covers
 * "now" they are on break / unavailable; otherwise they are available.
 */
export function technicianRows(
  appointments: Appointment[],
  blockouts: TechnicianBlockout[],
  now: number | null,
): TechnicianRow[] {
  const blocks = buildBlocks(appointments);

  return workingTechnicians.map((technician) => {
    const mine = blocksForTechnician(blocks, technician.id).filter(isActiveBlock);
    const myBlockouts = blockouts
      .filter((blockout) => blockout.technicianId === technician.id)
      .sort((a, b) => a.start - b.start);

    let state: TechnicianState = "Available";
    let detail: string | undefined;
    let freeAt: number | undefined;

    if (now !== null) {
      const blockout = myBlockouts.find((item) => now >= item.start && now < item.end);
      const current = mine.find((block) => now >= block.start && now < block.start + block.duration);

      if (blockout) {
        state = isBreakKind(blockout.kind) ? "Break" : "Off";
        detail = blockout.label;
        freeAt = blockout.end;
      } else if (current) {
        state = "In Service";
        detail = `${current.guestName} — ${current.serviceLabel}`;
        freeAt = current.start + current.duration;
      }
    }

    return {
      id: technician.id,
      name: technician.name,
      initials: technician.initials,
      state,
      ...(detail ? { detail } : {}),
      ...(freeAt !== undefined ? { freeAt } : {}),
    };
  });
}
