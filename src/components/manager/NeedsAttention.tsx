import { useState } from "react";
import { AlertTriangle, ChevronDown, Clock, Footprints, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingType, isGroup, type Appointment } from "@/data/manager-mock";

type Alert = {
  id: string;
  icon: typeof AlertTriangle;
  short: string;
  text: string;
  appointmentId?: string;
};

const isLive = (appointment: Appointment) =>
  appointment.guests.some((guest) => guest.status !== "Cancelled");

/** Derived from the schedule + clock — nothing here needs a manual status. */
function buildAlerts(appointments: Appointment[], now: number | null): Alert[] {
  const alerts: Alert[] = [];
  const live = appointments.filter(isLive);

  const waitingWalkIns = live.filter(
    (appointment) =>
      bookingType(appointment) === "Walk-In" &&
      appointment.guests.some((guest) => guest.technicianId === "any") &&
      (now === null || appointment.minutes <= now),
  );
  if (waitingWalkIns.length > 0) {
    alerts.push({
      id: "walkins",
      icon: Footprints,
      short: `${waitingWalkIns.length} walk-in waiting`,
      text: `${waitingWalkIns.length} walk-in${waitingWalkIns.length > 1 ? "s" : ""} waiting for a technician`,
      appointmentId: waitingWalkIns[0]!.id,
    });
  }

  const dueAppointments = live.filter(
    (appointment) =>
      bookingType(appointment) === "Appointment" &&
      appointment.guests.some((guest) => guest.technicianId === "any") &&
      now !== null &&
      appointment.minutes <= now + 15,
  );
  if (dueAppointments.length > 0) {
    alerts.push({
      id: "due",
      icon: Clock,
      short: `${dueAppointments.length} appointment due`,
      text: `${dueAppointments.length} appointment${dueAppointments.length > 1 ? "s" : ""} due now and still unassigned`,
      appointmentId: dueAppointments[0]!.id,
    });
  }

  const unassigned = live.filter((appointment) =>
    appointment.guests.some((guest) => guest.technicianId === "any"),
  );
  if (unassigned.length > 0) {
    alerts.push({
      id: "unassigned",
      icon: UserPlus,
      short: `${unassigned.length} unassigned`,
      text: `${unassigned.length} booking${unassigned.length > 1 ? "s" : ""} still need a technician`,
      appointmentId: unassigned[0]!.id,
    });
  }

  const groups = live.filter(isGroup);
  if (groups.length > 0) {
    alerts.push({
      id: "group",
      icon: AlertTriangle,
      short: `${groups.length} group booking`,
      text: `${groups.length} group booking${groups.length > 1 ? "s" : ""} today — seat them together if you can`,
      appointmentId: groups[0]!.id,
    });
  }

  return alerts;
}

/** Compact collapsible bar so the schedule keeps the screen. */
export function NeedsAttention({
  appointments,
  nowMinutes,
  onOpen,
}: {
  appointments: Appointment[];
  nowMinutes: number | null;
  onOpen: (appointmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const alerts = buildAlerts(appointments, nowMinutes);

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
