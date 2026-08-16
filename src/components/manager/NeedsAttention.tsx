import { AlertTriangle, Clock, UserPlus, Users } from "lucide-react";
import {
  isGroup,
  type Appointment,
} from "@/data/manager-mock";

type Alert = {
  id: string;
  icon: typeof AlertTriangle;
  text: string;
  appointmentId?: string;
};

/** Derived, not stored — real data can replace `appointments` with no changes here. */
function buildAlerts(appointments: Appointment[]): Alert[] {
  const alerts: Alert[] = [];

  const unassigned = appointments.filter(
    (appointment) =>
      !["Completed", "Cancelled", "No Show"].includes(appointment.guests[0]!.status) &&
      appointment.guests.some((guest) => guest.technicianId === "any"),
  );
  if (unassigned.length > 0) {
    alerts.push({
      id: "unassigned",
      icon: UserPlus,
      text: `${unassigned.length} appointment${unassigned.length > 1 ? "s" : ""} need technician assignment`,
      appointmentId: unassigned[0]!.id,
    });
  }

  const groups = appointments.filter(
    (appointment) =>
      isGroup(appointment) &&
      appointment.guests.some((guest) => ["Scheduled", "Checked In"].includes(guest.status)),
  );
  if (groups.length > 0) {
    alerts.push({
      id: "group",
      icon: Users,
      text: `${groups.length} group appointment${groups.length > 1 ? "s" : ""} arriving soon`,
      appointmentId: groups[0]!.id,
    });
  }

  const next = appointments.find((appointment) => appointment.guests[0]!.status === "Scheduled");
  if (next) {
    alerts.push({
      id: "starting",
      icon: Clock,
      text: `${next.title} starts in 10 minutes`,
      appointmentId: next.id,
    });
  }

  const waiting = appointments.filter((appointment) =>
    appointment.guests.some((guest) => guest.status === "Waiting"),
  );
  if (waiting.length > 0) {
    alerts.push({
      id: "waiting",
      icon: AlertTriangle,
      text: `${waiting.length} guest${waiting.length > 1 ? "s" : ""} waiting to be started`,
      appointmentId: waiting[0]!.id,
    });
  }

  return alerts;
}

export function NeedsAttention({
  appointments,
  onOpen,
}: {
  appointments: Appointment[];
  onOpen: (appointmentId: string) => void;
}) {
  const alerts = buildAlerts(appointments);

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-xs font-extrabold tracking-[0.12em] uppercase text-muted-foreground">
          Needs attention
        </h2>
        <span className="text-xs font-bold text-muted-foreground">{alerts.length} items</span>
      </div>
      {alerts.length === 0 ? (
        <p className="px-1 pb-1 text-sm text-muted-foreground">All clear right now.</p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => alert.appointmentId && onOpen(alert.appointmentId)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-status-warn-bg/50 px-2.5 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-status-warn-bg"
                >
                  <Icon className="size-4 shrink-0 text-status-warn-fg" aria-hidden />
                  <span className="leading-snug">{alert.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
