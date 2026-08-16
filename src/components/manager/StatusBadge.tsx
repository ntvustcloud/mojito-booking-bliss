import { cn } from "@/lib/utils";
import type { AppointmentStatus, TechnicianState } from "@/data/manager-mock";

const APPOINTMENT_TONE: Record<AppointmentStatus, string> = {
  Scheduled: "bg-status-neutral-bg text-status-neutral-fg",
  "Checked In": "bg-status-info-bg text-status-info-fg",
  Waiting: "bg-status-warn-bg text-status-warn-fg",
  Assigned: "bg-status-info-bg text-status-info-fg",
  "In Service": "bg-status-live-bg text-status-live-fg",
  Completed: "bg-status-done-bg text-status-done-fg",
  Cancelled: "bg-status-off-bg text-status-off-fg",
  "No Show": "bg-status-off-bg text-status-off-fg",
};

const TECH_TONE: Record<TechnicianState, string> = {
  Available: "bg-status-live-bg text-status-live-fg",
  "In Service": "bg-status-info-bg text-status-info-fg",
  Break: "bg-status-warn-bg text-status-warn-fg",
  Off: "bg-status-neutral-bg text-status-neutral-fg",
};

const base =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap";

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  return <span className={cn(base, APPOINTMENT_TONE[status], className)}>{status}</span>;
}

export function GroupBadge({ count }: { count: number }) {
  return (
    <span className={cn(base, "bg-secondary text-secondary-foreground")}>Group · {count}</span>
  );
}

export function TechStateBadge({
  state,
  className,
}: {
  state: TechnicianState;
  className?: string;
}) {
  return <span className={cn(base, TECH_TONE[state], className)}>{state}</span>;
}
