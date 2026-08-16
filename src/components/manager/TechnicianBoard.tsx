import {
  guestServiceLabel,
  workingTechnicians,
  type Appointment,
  type TechnicianShift,
  type TechnicianState,
} from "@/data/manager-mock";
import { TechStateBadge } from "@/components/manager/StatusBadge";

type Row = {
  id: string;
  name: string;
  initials: string;
  state: TechnicianState;
  detail?: string;
  startedAt?: string;
};

function buildRows(appointments: Appointment[], shifts: TechnicianShift[]): Row[] {
  return workingTechnicians.map((technician) => {
    const shift = shifts.find((item) => item.technicianId === technician.id);
    let state: TechnicianState = shift?.state ?? "Available";

    let detail: string | undefined;
    let startedAt: string | undefined;

    for (const appointment of appointments) {
      const guest = appointment.guests.find(
        (item) => item.technicianId === technician.id && item.status === "In Service",
      );
      if (guest) {
        state = "In Service";
        detail = `${guest.name} — ${guestServiceLabel(guest)}`;
        startedAt = guest.startedAt;
        break;
      }
    }

    if (state === "In Service" && !detail) state = "Available";

    return {
      id: technician.id,
      name: technician.name,
      initials: technician.initials,
      state,
      ...(detail ? { detail } : {}),
      ...(startedAt ? { startedAt } : {}),
    };
  });
}

export function TechnicianBoard({
  appointments,
  shifts,
}: {
  appointments: Appointment[];
  shifts: TechnicianShift[];
}) {
  const rows = buildRows(appointments, shifts);
  const available = rows.filter((row) => row.state === "Available").length;

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h2 className="text-xs font-extrabold tracking-[0.12em] uppercase text-muted-foreground">
          Technicians
        </h2>
        <span className="text-xs font-bold text-primary">{available} available</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-2.5 px-3 py-2.5">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-extrabold text-secondary-foreground">
              {row.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-foreground">{row.name}</p>
                <TechStateBadge state={row.state} />
              </div>
              {row.detail && (
                <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
              )}
              {row.startedAt && (
                <p className="text-xs text-muted-foreground/80">Started {row.startedAt}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
