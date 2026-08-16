import {
  technicianRows,
  type Appointment,
  type TechnicianShift,
} from "@/data/manager-mock";
import { TechStateBadge } from "@/components/manager/StatusBadge";

export function TechnicianBoard({
  appointments,
  shifts,
}: {
  appointments: Appointment[];
  shifts: TechnicianShift[];
}) {
  const rows = technicianRows(appointments, shifts);
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
