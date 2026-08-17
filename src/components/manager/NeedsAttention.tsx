import { useState } from "react";
import { AlertTriangle, ChevronDown, Clock, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { isGroup, type Appointment } from "@/data/manager-mock";

type Alert = {
  id: string;
  icon: typeof AlertTriangle;
  short: string;
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
      short: `${unassigned.length} unassigned`,
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
      short: `${groups.length} group arriving soon`,
      text: `${groups.length} group appointment${groups.length > 1 ? "s" : ""} arriving soon`,
      appointmentId: groups[0]!.id,
    });
  }

  const next = appointments.find((appointment) => appointment.guests[0]!.status === "Scheduled");
  if (next) {
    alerts.push({
      id: "starting",
      icon: Clock,
      short: `${next.title} starting soon`,
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
      short: `${waiting.length} waiting`,
      text: `${waiting.length} guest${waiting.length > 1 ? "s" : ""} waiting to be started`,
      appointmentId: waiting[0]!.id,
    });
  }

  return alerts;
}

/** Compact collapsible bar so the schedule keeps the screen. */
export function NeedsAttention({
  appointments,
  onOpen,
}: {
  appointments: Appointment[];
  onOpen: (appointmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const alerts = buildAlerts(appointments);

  if (alerts.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground">
        All clear — nothing needs attention.
      </p>
    );
  }

  return (
    <section className="rounded-lg border border-status-warn-fg/25 bg-status-warn-bg/45">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <AlertTriangle className="size-4 shrink-0 text-status-warn-fg" aria-hidden />
        <span className="text-xs font-extrabold text-status-warn-fg">
          Needs Attention ({alerts.length})
        </span>
        <span className="min-w-0 truncate text-xs font-semibold text-status-warn-fg/80">
          {alerts.map((alert) => alert.short).join(" · ")}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 text-status-warn-fg transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-status-warn-fg/20 px-2 py-2">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => alert.appointmentId && onOpen(alert.appointmentId)}
                className="flex w-full items-center gap-2 rounded-md bg-card/70 px-2.5 py-1.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-card"
              >
                <alert.icon className="size-3.5 shrink-0 text-status-warn-fg" aria-hidden />
                {alert.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
